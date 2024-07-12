#pragma once

#include <algorithm>
#include <cmath>
#include <cstdio>
#include <iomanip>
#include <iostream>
#include <string>
#include <utility>
#include <vector>

#include <opencv2/dnn/dnn.hpp>
#include <opencv2/opencv.hpp>

#ifndef CLAMP
#define CLAMP(x, l, u) ((x) < (l) ? (l) : ((x) > (u) ? (u) : (x)))
#endif

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

#define EPS 1e-5

#define CYAN CV_RGB(0, 255, 255)
#define BLUE CV_RGB(0, 0, 255)
#define GREEN CV_RGB(0, 255, 0)
#define RED CV_RGB(255, 0, 0)
#define PURPLE CV_RGB(139, 0, 255)

struct Window {
    int x, y, width, angle;
    float score;
    std::vector<cv::Point> points14;
    Window(const int x_, const int y_, const int w_, const int a_, const float s_, std::vector<cv::Point> p14_)
        : x(x_)
        , y(y_)
        , width(w_)
        , angle(a_)
        , score(s_)
        , points14(std::move(p14_))
    {
    }
};

cv::Point RotatePoint(float x, float y, float centerX, float centerY, float angle);
void DrawLine(cv::Mat img, const std::vector<cv::Point>&& pointList);
void DrawFace(const cv::Mat& img, const Window& face);
void DrawPoints(cv::Mat img, const Window& face);
cv::Mat CropFace(const cv::Mat& img, const Window& face, int cropSize);

class PCN {
public:
    PCN(const std::string& modelDetect,
        const std::string& net1,
        const std::string& net2,
        const std::string& net3,
        const std::string& modelTrack,
        const std::string& netTrack);
    /// detection
    void SetMinFaceSize(int minFace);
    void SetDetectionThresh(float thresh1, float thresh2, float thresh3);
    void SetImagePyramidScaleFactor(float factor);
    [[nodiscard]] std::vector<Window> Detect(const cv::Mat& img);
    /// tracking
    void SetTrackingPeriod(int period);
    void SetTrackingThresh(float thresh);
    void SetVideoSmooth(bool smooth);
    [[nodiscard]] std::vector<Window> DetectTrack(const cv::Mat& img);

private:
    void* impl_;
};
