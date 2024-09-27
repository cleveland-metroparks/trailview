#include <cstdio>
#include <cstdlib>

#include "equirect-blur-common.h"

#define DEG2RAD(d) ((d) * M_PI / 180.0f)
#define RAD2DEG(r) (180.0f * (r) / M_PI)

#define ABS(x) ((x) < 0 ? -(x) : (x))

cv::Mat Projection::eulerYZrotation(const double lambda, const double phi)
{
    // Calculate rotation about Y axis
    const cv::Mat R_y = (cv::Mat_<double>(3, 3) << cos(lambda), 0, sin(lambda), 0, 1, 0, -sin(lambda), 0, cos(lambda));

    // Calculate rotation about Z axis
    const cv::Mat R_z = (cv::Mat_<double>(3, 3) << cos(phi), -sin(phi), 0, sin(phi), cos(phi), 0, 0, 0, 1);

    return R_y * R_z;
}

static cv::Vec2f calculate_source_uv(const double u, const double v, const cv::Mat& rot_mat)
{
    /* Convert to cartesian for rotation */
    cv::Vec3d target_xyz;
    target_xyz[0] = -sin(u) * cos(v);
    target_xyz[1] = sin(u) * sin(v);
    target_xyz[2] = cos(u);

    cv::Mat source_xyz = rot_mat * target_xyz;

    cv::Vec2d source_uv;
    source_uv[0] = atan2(source_xyz.at<double>(1), -source_xyz.at<double>(0));
    source_uv[1] = acos(source_xyz.at<double>(2));

    if (source_uv[0] < 0)
        source_uv[0] += 2 * M_PI;
    else if (source_uv[0] >= 2 * M_PI)
        source_uv[0] -= 2 * M_PI;

    return source_uv;
}

static cv::Vec2f calculate_source_xy(
    const double u,
    const double v,
    const cv::Mat& rot_mat,
    const int x_offset,
    const int y_offset,
    const int in_width,
    const int in_height)
{
    cv::Vec2f source_uv = calculate_source_uv(u, v, rot_mat);

    cv::Vec2f src_pixel;

    src_pixel[0]
        = static_cast<float>(in_width) * source_uv[0] / (2 * static_cast<float>(M_PI)) + static_cast<float>(x_offset);
    src_pixel[1]
        = static_cast<float>(in_height) * source_uv[1] / static_cast<float>(M_PI) + static_cast<float>(y_offset);

    return src_pixel;
}

void Projection::create_subregion_map()
{
    int in_width = this->equ_size.width;
    int in_height = this->equ_size.height;
    int tmp_width = static_cast<int>(round(static_cast<float>(in_width) * this->cropped_aperture[0] / (2 * M_PI)));
    int tmp_height = static_cast<int>(round(static_cast<float>(in_height) * this->cropped_aperture[1] / M_PI));

    double u, v;

    this->e2pMap = cv::Mat(tmp_height, tmp_width, CV_32FC2);

#if 0
    cout << "Creating map phi=" << projection.phi << " lambda=" << projection.lambda << endl;
    cout << "in WxH " << in_width << " x " << in_height << endl;
    cout << "target WxH " << tmp_width << " x " << tmp_height << endl;
#endif

    for (int y = 0; y < tmp_height; y++) {
        for (int x = 0; x < tmp_width; x++) {
            /* Calculate the U/V lat/long of the target cropped pixel */
            const double x_h = static_cast<double>(x) / (tmp_width - 1) - 0.5;
            const double y_h = static_cast<double>(y) / (tmp_height - 1) - 0.5;

            /* Scale to radians in the uncropped equirectangular frame */
            v = x_h * this->cropped_aperture[0] + M_PI;
            u = y_h * this->cropped_aperture[1] + M_PI / 2;

            this->e2pMap.at<cv::Vec2f>(y, x) = calculate_source_xy(u, v, this->p2eRot, 0, 0, in_width, in_height);
        }
    }
}

/* Given an ROI on the full source image, in image coordinates,
 * calculate a map from the cropped projection into the full image */
static cv::Mat create_roi_map_to_equ(
    const Projection& projection, const cv::Mat& image, const cv::Mat& tmp_image, cv::Rect& roi)
{
    const int in_width = image.cols;
    const int in_height = image.rows;
    const int tmp_width = tmp_image.cols;
    const int tmp_height = tmp_image.rows;

    auto ret = cv::Mat(roi.height, roi.width, CV_32FC2);
    const cv::Mat e2pRot = projection.p2eRot.t();

    /* Offset for cropped image x/y */
    const int x_offset = -(in_width - tmp_width) / 2;
    const int y_offset = -(in_height - tmp_height) / 2;

    for (int y = 0; y < roi.height; y++) {
        for (int x = 0; x < roi.width; x++) {
            /* Calculate the U/V lat/long of the ROI pixel in the source frame */
            const float x_h = static_cast<float>(x + roi.x) / static_cast<float>(in_width - 1) - 0.5f;
            const float y_h = static_cast<float>(y + roi.y) / static_cast<float>(in_height - 1) - 0.5f;

            /* Convert to radians */
            double v = x_h * 2 * M_PI + M_PI;
            double u = y_h * M_PI + M_PI / 2;

            // Rotated UV in cropped image
            cv::Vec2f target = calculate_source_xy(u, v, e2pRot, x_offset, y_offset, in_width, in_height);
            ret.at<cv::Vec2f>(y, x) = target;

#if 0
          cout << "x " << x + roi.x << ", y " << y + roi.y <<
              " U = " << u << " (" << RAD2DEG(u) << ") V = " << v << " (" << RAD2DEG(v) << ") -> x " <<
              target[0] << " y " << target[1] << endl;
#endif
        }
    }

    return ret;
}
static void extract_subregion(const Projection& projection, const cv::Mat& image, cv::Mat& tmp_image)
{
    // cout << "subregion size " << tmp_image.cols << " x " << tmp_image.rows << endl;
    remap(image, tmp_image, projection.e2pMap, cv::noArray(), cv::INTER_LINEAR, cv::BORDER_WRAP);
}

static cv::Rect blur_face(const cv::Mat& img, const Window& face, const bool draw_over_faces)
{
    /* Calculate and extract a bounding rectangle around the
     * (rotated) face and extract it as a ROI from the cropped
     * frame for blurring and later remapping into the source */
    /* Expand face rect by 25% each side */
    float face_padding = static_cast<float>(face.width) / 4.0f;

    const float x1 = static_cast<float>(face.x) - face_padding;
    const float y1 = static_cast<float>(face.y) - face_padding;
    const float x2 = static_cast<float>(face.x + face.width) + face_padding - 1;
    const float y2 = static_cast<float>(face.y + face.width) + face_padding - 1;
    const float centerX = (x1 + x2) / 2;
    const float centerY = (y1 + y2) / 2;

    const float angle_rad = DEG2RAD(face.angle);
    const float dst_size = static_cast<float>(face.width + 2) * face_padding;
    const float rot_size = dst_size * (ABS(sin(angle_rad)) + ABS(cos(angle_rad)));
    const int dst_size_pixels = static_cast<int>(ceil(dst_size));

    cv::Point2f srcTriangle[4]; /* 4th vertex is just for debug */
    cv::Point2f dstTriangle[4]; /* 4th vertex is just for debug */

    srcTriangle[0] = RotatePoint(x1, y1, centerX, centerY, static_cast<float>(face.angle));
    srcTriangle[1] = RotatePoint(x1, y2, centerX, centerY, static_cast<float>(face.angle));
    srcTriangle[2] = RotatePoint(x2, y2, centerX, centerY, static_cast<float>(face.angle));
    srcTriangle[3] = RotatePoint(x2, y1, centerX, centerY, static_cast<float>(face.angle));
    dstTriangle[0] = cv::Point(0, 0);
    dstTriangle[1] = cv::Point(0, dst_size_pixels - 1);
    dstTriangle[2] = cv::Point(dst_size_pixels - 1, dst_size_pixels - 1);
    dstTriangle[3] = cv::Point(dst_size_pixels - 1, 0);

    // cout << "Face x " << face.x << " y " << face.y << " angle " << face.angle << " (rad " << angle_rad << ") w " <<
    // face.width << " size " << rot_size << endl;

    /* Find bounding box of the source area */
    float min_x, min_y;

    if (face.angle > 0 && face.angle <= 90) {
        min_x = srcTriangle[0].x;
        min_y = srcTriangle[3].y; // srcTriangle[1].y - rot_size;
    }
    else if (face.angle > 90 && face.angle <= 270) {
        min_x = srcTriangle[3].x; // srcTriangle[1].x - rot_size;
        min_y = srcTriangle[2].y;
    }
    else if (face.angle < 0 && face.angle >= -90) {
        min_x = srcTriangle[1].x;
        min_y = srcTriangle[0].y;
    }
    else { /* -90 to -180 */
        min_x = srcTriangle[2].x;
        min_y = srcTriangle[1].y;
    }
    int max_x_pix = static_cast<int>(ceil(min_x + rot_size));
    int max_y_pix = static_cast<int>(ceil(min_y + rot_size));
    int min_x_pix = static_cast<int>(floor(min_x));
    int min_y_pix = static_cast<int>(floor(min_y));

    /* Calculate ROI to extract from the main image */
    min_x_pix = CLAMP(min_x_pix, 0, img.cols - 1);
    max_x_pix = CLAMP(max_x_pix, 0, img.cols - 1);
    min_y_pix = CLAMP(min_y_pix, 0, img.rows - 1);
    max_y_pix = CLAMP(max_y_pix, 0, img.rows - 1);

    for (cv::Point2f point : srcTriangle) {
        // cout << "Face quad " << i << " x " << srcTriangle[i].x << " y " << srcTriangle[i].y << endl;
        point.x -= min_x;
        point.y -= min_y;
    }

    const auto roi = cv::Rect(min_x_pix, min_y_pix, max_x_pix - min_x_pix, max_y_pix - min_y_pix);

    // cout << "ROI x " << roi.x << " y < " << roi.y << " w " << roi.width << " h " << roi.height << endl;

    const cv::Mat rotMat = getAffineTransform(srcTriangle, dstTriangle);
    cv::Mat crop_roi = img(roi);
    cv::Mat face_img;

#if 0
    /* Draw quads around the whole padded area, and just around the face */
    cv::rectangle(face_img,cv::Point(face_padding,face_padding),
            cv::Point(face_padding+face.width-1,face_padding+face.width-1),cv::Scalar(255,64,64),1);

    cv::line(face_img, dstTriangle[0], dstTriangle[1], RED, 3);
    cv::line(face_img, dstTriangle[1], dstTriangle[2], BLUE, 3);
    cv::line(face_img, dstTriangle[2], dstTriangle[3], GREEN, 3);
    cv::line(face_img, dstTriangle[3], dstTriangle[0], CYAN, 3);
#elif 1
    if (draw_over_faces) {
        /* Draw grey rectangle to obscure the face */
        face_img = cv::Mat(dst_size_pixels, dst_size_pixels, img.type());
        rectangle(
            face_img, cv::Point(0, 0), cv::Point(dst_size_pixels - 1, dst_size_pixels - 1), cv::Scalar(64, 64, 64), -1);
    }
    else {
        /* blur the face */
        if (crop_roi.rows != 0 && crop_roi.cols != 0) {
            warpAffine(crop_roi, face_img, rotMat, cv::Size(dst_size_pixels, dst_size_pixels));
            GaussianBlur(face_img, face_img, cv::Size(31, 31), 10);
        }
    }
#elif 0
    /* Draw GREEN rectangle to obscure the face */
    cv::rectangle(face_img, cv::Point(0, 0), cv::Point(face.width - 1, face.width - 1), cv::Scalar(64, 255, 64), -1);
#endif
    if (face_img.rows != 0 && face_img.cols != 0) {
        /* Warp blurred/covered picture back into the source orientation */
        warpAffine(
            face_img,
            crop_roi,
            rotMat,
            cv::Size(crop_roi.rows, crop_roi.cols),
            cv::WARP_INVERSE_MAP | cv::INTER_LINEAR,
            cv::BORDER_TRANSPARENT);
    }

    // imshow("Face", crop_roi);
    // imshow("Face", face_img);
    // waitKey(0);

    /* Return the rect that needs copying back into the original equirect projection */
    return roi;
}

// We have faces to project back to the full frame
// For each face, calculate bounding rectangles in the
// equirect frame and generate a map back from the face ROI
// to it. The reprojection may cross the edges of the image
// and gets complicated
static void project_faces_to_full_frame(Projection& projection, cv::Mat& equ_image, const cv::Mat& cropped_image)
{
    std::vector<cv::Rect> rects; /* ROI rects in the source frame */

    for (size_t f = 0; f < projection.faces.size(); f++) {
        cv::Rect roi = projection.faces[f];
        cv::Point2f srcQuad[4];
        cv::Point2f dstQuad[4];
        srcQuad[0] = cv::Point(roi.x, roi.y);
        srcQuad[1] = cv::Point(roi.x, roi.y + roi.height);
        srcQuad[2] = cv::Point(roi.x + roi.width, roi.y + roi.height);
        srcQuad[3] = cv::Point(roi.x + roi.width, roi.y);

        // cout << "Face quad: " << endl;
        for (int i = 0; i < 4; i++) {
            int y = static_cast<int>(round(srcQuad[i].y));
            int x = static_cast<int>(round(srcQuad[i].x));

            auto p = projection.e2pMap.at<cv::Vec2f>(y, x);
            dstQuad[i] = cv::Point2f(p[0], p[1]);
            // cout << "  vertex " << i << " from " << x << ", " << y << " src image " << p[0] << ", " << p[1] << endl;
        }

        const int min_x = static_cast<int>(floor(MIN(dstQuad[0].x, dstQuad[1].x)));
        const int max_x = static_cast<int>(ceil(MAX(dstQuad[2].x, dstQuad[3].x)));

        const int min_y = static_cast<int>(floor(MIN(dstQuad[0].y, dstQuad[3].y)));
        const int max_y = static_cast<int>(ceil(MAX(dstQuad[1].y, dstQuad[2].y)));

#if 0
        cv::line(equ_image, dstQuad[0], dstQuad[1], RED, 3);
        cv::line(equ_image, dstQuad[1], dstQuad[2], BLUE, 3);
        cv::line(equ_image, dstQuad[2], dstQuad[3], GREEN, 3);
        cv::line(equ_image, dstQuad[3], dstQuad[0], CYAN, 3);
#endif

        /* The destination quad may cross edges and need to be split into up to 4 sub-quads and
         * remapped */
        if (min_x > max_x) {
            if (min_y > max_y) {
                /* Crossed both right and bottom edges - 4 quads */
                rects.emplace_back(min_x, min_y, equ_image.cols - 1 - min_x, equ_image.rows - 1 - min_y);
                rects.emplace_back(0, min_y, max_x, equ_image.rows - 1 - min_y);
                rects.emplace_back(min_x, 0, equ_image.cols - 1 - min_x, max_y);
                rects.emplace_back(0, 0, max_x, max_y);
            }
            else {
                /* Crossed right edge */
                rects.emplace_back(min_x, min_y, equ_image.cols - 1 - min_x, max_y - min_y);
                rects.emplace_back(0, min_y, max_x, max_y - min_y);
            }
        }
        else if (min_y > max_y) {
            /* Crossed bottom edge */
            rects.emplace_back(min_x, min_y, max_x - min_x, equ_image.rows - 1 - min_y);
            rects.emplace_back(min_x, 0, max_x - min_x, max_y);
        }
        else {
            /* Just one quad */
            rects.emplace_back(min_x, min_y, max_x - min_x, max_y - min_y);
        }
    }
#if 0
    for (int i = 0; i < rects.size(); i++) {
        cv::Rect roi = rects[i];
        cout << "ROI x " << roi.x << " y " << roi.y << " w " << roi.width << " h " << roi.height << endl;
    }
#endif

    for (cv::Rect& rect : rects) {
        if (rect.width <= 0 || rect.height <= 0)
            continue;
        cv::Mat map = create_roi_map_to_equ(projection, equ_image, cropped_image, rect);
        cv::Mat image_roi = equ_image(rect);
        remap(cropped_image, image_roi, map, cv::noArray(), cv::INTER_LINEAR, cv::BORDER_TRANSPARENT);
    }
}

bool equirect_blur_process_frame(cv::Mat& image, std::vector<Projection>& projections, const bool draw_over_faces)
{
    /*
     * Sweep the sphere in steps, calculating a centre
     * λ and φ and extract sub-images that should allow face
     * recognition to work at latitudes away from the equator
     */
    const int in_width = image.cols;
    const int in_height = image.rows;

    /* Calculate a temporary image size that matches the target aperture */
    const int tmp_width = static_cast<int>(round(static_cast<float>(in_width) * X_APERTURE / (2 * M_PI)));
    const int tmp_height = static_cast<int>(round(static_cast<float>(in_height) * Y_APERTURE / M_PI));

    cv::Mat tmp_image(tmp_height, tmp_width, image.type());
    for (Projection& p : projections) {
        // cout << "Region phi=" << p.phi << " lambda=" << p.lambda << endl;
        //
        if (p.equ_size.width != image.cols || p.equ_size.height != image.rows) {
            std::cerr << "Input image size mismatch (expected " << p.equ_size.height << " x " << p.equ_size.width
                      << " got " << image.rows << " x " << image.cols << ")" << std::endl;
            return false;
        }

        extract_subregion(p, image, tmp_image);
#if 0
      imshow("Cropped frame", tmp_image);
      waitKey(0);
#endif

        // Detect faces in this sub-image
        // Extract faces and blur into the cropped image
        if (std::vector<Window> faces = p.detector->Detect(tmp_image); !faces.empty()) {
            // cout << "Detected " << faces.size() << " faces" << endl;
            p.faces.clear();

            for (const Window& face : faces) {
                p.faces.push_back(blur_face(tmp_image, face, draw_over_faces));
                // DrawFace(tmp_image, faces[j]);
                // drawpoints(tmp_image, faces[j]);
            }

#if 0
          //imshow("Region", tmp_image);
          std::stringstream fname;
          fname << "img" << n << ".jpg";
          imwrite(fname.str().c_str(), tmp_image);
          //waitKey(0);
#endif

            // Project blurred areas back to the full frame
            project_faces_to_full_frame(p, image, tmp_image);
        }
    }

#if 0
    imshow("Source", image);
    waitKey(0);
#endif

    return true;
}
