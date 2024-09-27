#include "equirect-blur-common.h"
#include <cctype>
#include <filesystem>
#include <iostream>
#include <string>
#include <vector>

inline bool ends_with(std::string const& value, std::string const& ending)
{
    if (ending.size() > value.size())
        return false;
    return std::equal(ending.rbegin(), ending.rend(), value.rbegin());
}

int main(int argc, const char** argv)
{
    cv::CommandLineParser parser(
        argc,
        argv,
        "{help h||}"
        "{blur b|true|If supplied, faces are blurred rather than hidden with rectangles}"
        "{thresh t|0.9175|Threshold value}"
        "{models-dir m||Path to PCN models}"
        "{output-dir o||Output file}"
        "{@input-dir||Input directory}");
    parser.about("\nA utility that extracts strips of images from an equirectangular source\n"
                 "image into the relatively undistorted equatorial band, and then uses the OpenCV\n"
                 "cv::CascadeClassifier class to detect faces and apply blur to them\n");

    if (parser.get<bool>("help")) {
        parser.printMessage();
        return 0;
    }

    auto thresh_arg = parser.get<float>("thresh");

    auto input_dir = parser.get<cv::String>("@input-dir");

    auto output_dir = parser.get<cv::String>("output-dir");

    std::vector<cv::String> files;
    for (const auto& file : std::filesystem::directory_iterator(input_dir)) {
        std::cout << "File: " << file.path().u8string() << std::endl;
        std::string file_str_lowered = file.path().u8string();
        std::transform(
            file_str_lowered.begin(), file_str_lowered.end(), file_str_lowered.begin(), [](const unsigned char c) {
                return std::tolower(c);
            });
        if (ends_with(file_str_lowered, ".jpg") == true) {
            std::filesystem::path output_dir_path(output_dir);
            std::filesystem::path output_file = output_dir_path / file.path().filename();
            output_file.replace_extension(".png");
            if (files.size() < 100 && !exists(output_file)) {
                std::cout << "Input File: " << file.path().u8string() << std::endl;
                files.push_back(file.path().u8string());
            }
        }
    }

    int first_width, first_height;
    if (!files.empty()) {
        cv::Mat im = cv::imread(files[0]);
        first_width = im.cols;
        first_height = im.rows;
    }
    else {
        return EXIT_SUCCESS;
    }

    auto models_dir = parser.get<cv::String>("models-dir");

    bool draw_over_faces = !parser.has("blur");

    /* Prepare cropped projection maps for processing */
    cv::Size image_size(first_width, first_height);
    float apertures[2] = { X_APERTURE, Y_APERTURE };
    std::vector<Projection> projections;
    std::cout << "Compiling detectors" << std::endl;

#pragma omp parallel for // NOLINT(*-use-default-none)
    for (int phi_step = 0; phi_step < static_cast<int>((M_PI / Y_STEP)); phi_step++) {
        float phi_full = static_cast<float>(phi_step) * Y_STEP;
        /* Calculate a phi (vertical tilt) from -M_PI/2 to M_PI/2 */
        float phi = phi_full <= M_PI / 2 ? phi_full : phi_full - static_cast<float>(M_PI);
        for (float lambda = 0; lambda < 2 * M_PI; lambda += X_STEP) { // NOLINT(*-flp30-c)

            auto detector = new PCN(
                models_dir + "/PCN.caffemodel",
                models_dir + "/PCN-1.prototxt",
                models_dir + "/PCN-2.prototxt",
                models_dir + "/PCN-3.prototxt",
                models_dir + "/PCN-Tracking.caffemodel",
                models_dir + "/PCN-Tracking.prototxt");

            /// detection
            detector->SetMinFaceSize(20);
            detector->SetImagePyramidScaleFactor(1.25f);
            // detector->SetDetectionThresh(0.37f, 0.43f, 0.85f);
            // detector->SetDetectionThresh(0.46f, 0.54f, 1.06f);
            // detector->SetDetectionThresh(0.9175f, 0.9175f, 0.9175f);
            detector->SetDetectionThresh(thresh_arg, thresh_arg, thresh_arg);
            /// tracking
            detector->SetTrackingPeriod(0);
            detector->SetTrackingThresh(9999.9f);
            detector->SetVideoSmooth(false);

            Projection projection(image_size, apertures, phi, lambda, detector);

#pragma omp critical
            projections.push_back(projection);
        }
    }

    for (auto& input_file : files) {

        std::cout << "Starting to Process: " << input_file << std::endl;

        cv::Mat im = cv::imread(input_file);
        if (im.rows != first_height || im.cols != first_width) {
            std::cout << "Exiting due to dimension change" << std::endl;
            return EXIT_SUCCESS;
        }
        if (im.data == nullptr) {
            parser.printMessage();
            std::cout << "Can't open image file " << input_file << std::endl;
            return 1;
        }

        if (!equirect_blur_process_frame(im, projections, draw_over_faces)) {
            std::cerr << "Processing frame failed" << std::endl;
            return 1;
        }

        std::filesystem::path output_dir_path(output_dir);
        std::filesystem::path input_file_path(input_file);

        std::filesystem::path output_file = output_dir_path / input_file_path.filename().replace_extension("png");

        std::cout << "Processed: " << output_file.u8string() << std::endl;

        imwrite(output_file.u8string(), im);
    }

    return 0;
}
