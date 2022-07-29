#include "config.h"
#include "equirect-blur-common.h"
#include <filesystem>
#include <vector>
#include <cctype>
#include <algorithm>
#include <string>

using namespace cv;
using namespace std;

inline bool ends_with(std::string const& value, std::string const& ending)
{
    if (ending.size() > value.size()) return false;
    return std::equal(ending.rbegin(), ending.rend(), value.rbegin());
}

int main( int argc, const char** argv )
{
    CommandLineParser parser(argc, argv,
                             "{help h||}"
                             "{blur b|true|If supplied, faces are blurred rather than hidden with rectangles}"
                             "{thresh t|0.9175|Threshold value}"
                             "{models-dir m||Path to PCN models}"
                             "{output-dir o||Output file}"
                             "{@input-dir||Input directory}"
                             );
    parser.about( "\nA utility that extracts strips of images from an equirectangular source\n"
           "image into the relatively undistorted equatorial band, and then uses the OpenCV\n"
           "cv::CascadeClassifier class to detect faces and apply blur to them\n");

    if (parser.get<bool>("help")) {
        parser.printMessage();
        return 0;
    }

    float thresh_arg = parser.get<float>("thresh");

    String input_dir = parser.get<String>("@input-dir");

    String output_dir = parser.get<String>("output-dir");

    std::vector<String> files;
    for (const auto& file : std::filesystem::directory_iterator(input_dir)) {
        std::string file_str_lowered = file.path().u8string();
        std::transform(file_str_lowered.begin(), file_str_lowered.end(), file_str_lowered.begin(),
            [](unsigned char c) { return std::tolower(c); });
        if (ends_with(file_str_lowered, ".jpg") == true) {
            std::filesystem::path output_dir_path(output_dir);
            std::filesystem::path output_file = output_dir_path / file.path().filename();
            if (files.size() < 100 && !std::filesystem::exists(output_file)) {
                std::cout << "Input File: " << file.path().u8string() << std::endl;
                files.push_back(file.path().u8string());
            }
        }
    }

    int first_width, first_height;
    if (!files.empty()) {
        Mat im = imread(files[0]);
        first_width = im.cols;
        first_height = im.rows;
    }
    else {
        return EXIT_SUCCESS;
    }

    String models_dir = parser.get<String>("models-dir");

    bool draw_over_faces = !parser.has("blur");

    /* Prepare cropped projection maps for processing */
    cv::Size image_size(first_width, first_height);
    float apertures[2] = { X_APERTURE, Y_APERTURE };
    std::vector<Projection> projections;
    cout << "Compiling detectors" << endl;

    #pragma omp parallel for
    for (int phi_step = 0; phi_step < (int)(M_PI/Y_STEP); phi_step++) {
      float phi_full = phi_step * Y_STEP;
      /* Calculate a phi (vertical tilt) from -M_PI/2 to M_PI/2 */
      float phi = phi_full <= M_PI/2 ? phi_full : phi_full - M_PI;
      for (float lambda = 0; lambda < 2*M_PI; lambda += X_STEP) {

          PCN *detector = new PCN(models_dir + "/PCN.caffemodel",
                 models_dir + "/PCN-1.prototxt",
                 models_dir + "/PCN-2.prototxt",
                 models_dir + "/PCN-3.prototxt",
                 models_dir + "/PCN-Tracking.caffemodel",
                 models_dir + "/PCN-Tracking.prototxt");
          
          /// detection
          detector->SetMinFaceSize(20);
          detector->SetImagePyramidScaleFactor(1.25f);
          //detector->SetDetectionThresh(0.37f, 0.43f, 0.85f);
          //detector->SetDetectionThresh(0.46f, 0.54f, 1.06f);
          //detector->SetDetectionThresh(0.9175f, 0.9175f, 0.9175f);
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

        cout << "Starting to Process: " << input_file << endl;

        Mat im = imread(input_file);
        if (im.rows != first_height || im.cols != first_width) {
            cout << "Exiting due to dimension change" << endl;
            return EXIT_SUCCESS;
        }
        if (im.data == NULL)
        {
            parser.printMessage();
            cout << "Can't open image file " << input_file << endl;
            return 1;
        }

        if (!equirect_blur_process_frame(im, projections, draw_over_faces)) {
            cerr << "Processing frame failed" << endl;
            return 1;
        }

        std::filesystem::path output_dir_path(output_dir);
        std::filesystem::path input_file_path(input_file);

        std::filesystem::path output_file = output_dir_path / input_file_path.filename();
        
        std::cout << "Processed: " << output_file.u8string() << std::endl;

        imwrite(output_file.u8string(), im);
    }

    return 0;

}
