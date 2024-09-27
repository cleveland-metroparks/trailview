#include "PCN.h"

struct Window2 {
    int x, y, w, h;
    float angle, scale, conf;
    int age;
    std::vector<cv::Point> points14;
    Window2(
        const int x_,
        const int y_,
        const int w_,
        const int h_,
        const float a_,
        const float s_,
        const float c_,
        const int age_)
        : x(x_)
        , y(y_)
        , w(w_)
        , h(h_)
        , angle(a_)
        , scale(s_)
        , conf(c_)
        , age(age_)
    {
    }
};

class Impl {
public:
    void LoadModel(
        const std::string& modelDetect,
        const std::string& net1,
        const std::string& net2,
        const std::string& net3,
        const std::string& modelTrack,
        const std::string& netTrack);
    static cv::Mat ResizeImg(const cv::Mat& img, float scale);
    static bool CompareWin(const Window2& w1, const Window2& w2);
    static bool Legal(int x, int y, const cv::Mat& img);
    static bool Inside(int x, int y, const Window2& rect);
    static float SmoothAngle(float a, float b);
    std::vector<Window2> SmoothWindow(std::vector<Window2> winList);
    static float IoU(const Window2& w1, const Window2& w2);
    static std::vector<Window2> NMS(std::vector<Window2>& winList, bool local, float threshold);
    static std::vector<Window2> DeleteFP(std::vector<Window2>& winList);
    [[nodiscard]] cv::Mat PreProcessImg(const cv::Mat& img) const;
    [[nodiscard]] cv::Mat PreProcessImg(const cv::Mat& img, int dim) const;
    [[nodiscard]] cv::Mat PadImg(const cv::Mat& img) const;
    static std::vector<Window> TransWindow(const cv::Mat& img, const cv::Mat& imgPad, std::vector<Window2>& winList);
    std::vector<Window2> Stage1(const cv::Mat& img, const cv::Mat& imgPad, cv::dnn::Net& net, float thres) const;
    std::vector<Window2> Stage2(
        const cv::Mat& img,
        const cv::Mat& img180,
        cv::dnn::Net& net,
        float thres,
        int dim,
        std::vector<Window2>& winList) const;
    std::vector<Window2> Stage3(
        const cv::Mat& img,
        const cv::Mat& img180,
        const cv::Mat& img90,
        const cv::Mat& imgNeg90,
        cv::dnn::Net& net,
        float thres,
        int dim,
        std::vector<Window2>& winList) const;
    std::vector<Window2> Detect(const cv::Mat& img, const cv::Mat& imgPad);
    std::vector<Window2> Track(
        const cv::Mat& img, cv::dnn::Net& net, float thres, int dim, std::vector<Window2>& winList) const;

    cv::dnn::Net net_[4];
    int minFace_ {};
    float scale_ {};
    int stride_ {};
    float classThreshold_[3] {};
    float nmsThreshold_[3] {};
    float angleRange_ {};
    bool stable_ {};
    int period_ {};
    float trackThreshold_ {};
    float augScale_ {};
    cv::Scalar mean_;

    int m_minTrackAge {};
    int m_trackDetectFlag {};
    std::vector<Window2> m_trackPreList;
    std::vector<Window2> m_smoothPreList;
};

PCN::PCN(
    const std::string& modelDetect,
    const std::string& net1,
    const std::string& net2,
    const std::string& net3,
    const std::string& modelTrack,
    const std::string& netTrack)
    : impl_(new Impl())
{
    const auto p = static_cast<Impl*>(impl_);
    p->m_minTrackAge = 5;
    p->LoadModel(modelDetect, net1, net2, net3, modelTrack, netTrack);
}

// ReSharper disable once CppMemberFunctionMayBeConst
void PCN::SetVideoSmooth(const bool smooth)
{
    const auto p = static_cast<Impl*>(impl_);
    p->stable_ = smooth;
}

// ReSharper disable once CppMemberFunctionMayBeConst
void PCN::SetMinFaceSize(const int minFace)
{
    const auto p = static_cast<Impl*>(impl_);
    p->minFace_ = 1.4 * minFace > 20 ? minFace : 20;
}

// ReSharper disable once CppMemberFunctionMayBeConst
void PCN::SetDetectionThresh(const float thresh1, const float thresh2, const float thresh3)
{
    const auto p = static_cast<Impl*>(impl_);
    p->classThreshold_[0] = thresh1;
    p->classThreshold_[1] = thresh2;
    p->classThreshold_[2] = thresh3;
    p->nmsThreshold_[0] = 0.8f;
    p->nmsThreshold_[1] = 0.8f;
    p->nmsThreshold_[2] = 0.3f;
    p->stride_ = 8;
    p->angleRange_ = 45;
    p->augScale_ = 0.15f;
    p->mean_ = cv::Scalar(104, 117, 123);
}

// ReSharper disable once CppMemberFunctionMayBeConst
void PCN::SetImagePyramidScaleFactor(const float factor)
{
    const auto p = static_cast<Impl*>(impl_);
    p->scale_ = factor;
}

// ReSharper disable once CppMemberFunctionMayBeConst
void PCN::SetTrackingPeriod(const int period)
{
    const auto p = static_cast<Impl*>(impl_);
    p->period_ = period;
}

// ReSharper disable once CppMemberFunctionMayBeConst
void PCN::SetTrackingThresh(const float thresh)
{
    const auto p = static_cast<Impl*>(impl_);
    p->trackThreshold_ = thresh;
}

// ReSharper disable once CppMemberFunctionMayBeConst
std::vector<Window> PCN::Detect(const cv::Mat& img)
{
    const auto p = static_cast<Impl*>(impl_);
    const cv::Mat imgPad = p->PadImg(img);
    std::vector<Window2> winList = p->Detect(img, imgPad);

    return Impl::TransWindow(img, imgPad, winList);
}

// ReSharper disable once CppMemberFunctionMayBeConst
std::vector<Window> PCN::DetectTrack(const cv::Mat& img)
{
    const auto p = static_cast<Impl*>(impl_);
    const cv::Mat imgPad = p->PadImg(img);

    p->m_trackDetectFlag = p->period_;

    std::vector<Window2> winList = p->m_trackPreList;

    if (p->m_trackDetectFlag == p->period_) {
        const std::vector<Window2> tmpList = p->Detect(img, imgPad);
        for (const Window2& window : tmpList) {
            winList.push_back(window);
        }
    }
    winList = Impl::NMS(winList, false, p->nmsThreshold_[2]);
    winList = p->Track(imgPad, p->net_[3], p->trackThreshold_, 96, winList);
    winList = Impl::NMS(winList, false, p->nmsThreshold_[2]);
    winList = Impl::DeleteFP(winList);
    if (p->stable_) {
        winList = p->SmoothWindow(winList);
    }
    p->m_trackPreList = winList;
    p->m_trackDetectFlag--;
    if (p->m_trackDetectFlag == 0)
        p->m_trackDetectFlag = p->period_;
    return Impl::TransWindow(img, imgPad, winList);
}

void Impl::LoadModel(
    const std::string& modelDetect,
    const std::string& net1,
    const std::string& net2,
    const std::string& net3,
    const std::string& modelTrack,
    const std::string& netTrack)
{
    net_[0] = cv::dnn::readNetFromCaffe(net1, modelDetect);
    net_[1] = cv::dnn::readNetFromCaffe(net2, modelDetect);
    net_[2] = cv::dnn::readNetFromCaffe(net3, modelDetect);
    net_[3] = cv::dnn::readNetFromCaffe(netTrack, modelTrack);

#if 0
    for (int i = 0; i < 4; i++) {
        net_[i].setPreferableBackend(cv::dnn::DNN_BACKEND_INFERENCE_ENGINE);
        net_[i].setPreferableTarget(cv::dnn::DNN_TARGET_OPENCL);
    }
#endif
}

cv::Mat Impl::PreProcessImg(const cv::Mat& img) const
{
    const cv::Mat mean(img.size(), CV_32FC3, mean_);
    cv::Mat imgF;
    img.convertTo(imgF, CV_32FC3);
    return imgF - mean;
}

cv::Mat Impl::PreProcessImg(const cv::Mat& img, const int dim) const
{
    cv::Mat imgNew;
    resize(img, imgNew, cv::Size(dim, dim));
    const cv::Mat mean(imgNew.size(), CV_32FC3, mean_);
    cv::Mat imgF;
    imgNew.convertTo(imgF, CV_32FC3);
    return imgF - mean;
}

cv::Mat Impl::ResizeImg(const cv::Mat& img, const float scale)
{
    cv::Mat ret;
    resize(
        img,
        ret,
        cv::Size(
            static_cast<int>(static_cast<float>(img.cols) / scale),
            static_cast<int>(static_cast<float>(img.rows) / scale)));
    return ret;
}

bool Impl::CompareWin(const Window2& w1, const Window2& w2)
{
    return w1.conf > w2.conf;
}

bool Impl::Legal(const int x, const int y, const cv::Mat& img)
{
    if (x >= 0 && x < img.cols && y >= 0 && y < img.rows)
        return true;
    return false;
}

bool Impl::Inside(const int x, const int y, const Window2& rect)
{
    if (x >= rect.x && y >= rect.y && x < rect.x + rect.w && y < rect.y + rect.h)
        return true;
    return false;
}

float Impl::SmoothAngle(float a, float b)
{
    if (a > b)
        std::swap(a, b);
    if (const float diff = fmod(b - a, 360.0f); diff < 180.0f)
        return a + diff / 2.0f;
    else
        return b + (360.0f - diff) / 2.0f;
}

float Impl::IoU(const Window2& w1, const Window2& w2)
{
    const float xOverlap
        = static_cast<float>(std::max(0, std::min(w1.x + w1.w - 1, w2.x + w2.w - 1) - std::max(w1.x, w2.x) + 1));
    const float yOverlap
        = static_cast<float>(std::max(0, std::min(w1.y + w1.h - 1, w2.y + w2.h - 1) - std::max(w1.y, w2.y) + 1));
    const float intersection = xOverlap * yOverlap;
    const float unio = static_cast<float>(w1.w * w1.h + w2.w * w2.h) - intersection;
    return static_cast<float>(intersection) / unio;
}

std::vector<Window2> Impl::NMS(std::vector<Window2>& winList, const bool local, const float threshold)
{
    if (winList.empty())
        return winList;
    std::sort(winList.begin(), winList.end(), CompareWin);

    std::vector flag(winList.size(), false);

    for (size_t i = 0; i < winList.size(); i++) {
        if (flag[i])
            continue;

        for (size_t j = i + 1; j < winList.size(); j++) {
            if (local && abs(winList[i].scale - winList[j].scale) > EPS)
                continue;
            if (IoU(winList[i], winList[j]) > threshold)
                flag[j] = true;
        }
    }
    std::vector<Window2> ret;
    for (size_t i = 0; i < winList.size(); i++) {
        if (!flag[i])
            ret.push_back(winList[i]);
    }
    return ret;
}

/// to delete some false positives
std::vector<Window2> Impl::DeleteFP(std::vector<Window2>& winList)
{
    if (winList.empty())
        return winList;
    std::sort(winList.begin(), winList.end(), CompareWin);
    std::vector flag(winList.size(), false);
    for (size_t i = 0; i < winList.size(); i++) {
        if (flag[i])
            continue;
        for (size_t j = i + 1; j < winList.size(); j++) {
            if (Inside(winList[j].x, winList[j].y, winList[i])
                && Inside(winList[j].x + winList[j].w - 1, winList[j].y + winList[j].h - 1, winList[i]))
                flag[j] = true;
        }
    }
    std::vector<Window2> ret;
    for (size_t i = 0; i < winList.size(); i++) {
        if (!flag[i])
            ret.push_back(winList[i]);
    }
    return ret;
}

/// to detect faces on the boundary
cv::Mat Impl::PadImg(const cv::Mat& img) const
{
    const int row = std::min(static_cast<int>(img.rows * 0.2), 100);
    const int col = std::min(static_cast<int>(img.cols * 0.2), 100);
    cv::Mat ret;
    copyMakeBorder(img, ret, row, row, col, col, cv::BORDER_CONSTANT, mean_);
    return ret;
}

std::vector<Window2> Impl::Stage1(const cv::Mat& img, const cv::Mat& imgPad, cv::dnn::Net& net, float thres) const
{
    std::vector<cv::String> outputBlobNames = { "bbox_reg_1", "cls_prob", "rotate_cls_prob" };

    int row = (imgPad.rows - img.rows) / 2;
    int col = (imgPad.cols - img.cols) / 2;
    std::vector<Window2> winList;
    constexpr int netSize = 24;
    float curScale;
    curScale = static_cast<float>(minFace_) / static_cast<float>(netSize);
    cv::Mat imgResized = ResizeImg(img, curScale);
    while (std::min(imgResized.rows, imgResized.cols) >= netSize) {
        cv::Mat preProcessed = PreProcessImg(imgResized);
        cv::Mat inputBlob = cv::dnn::blobFromImage(preProcessed, 1.0, cv::Size(), cv::Scalar(), false, false);
        std::vector<cv::Mat> outputBlobs;

        net.setInput(inputBlob);
        net.forward(outputBlobs, outputBlobNames);

        cv::Mat regression[3] = {
            cv::Mat(outputBlobs[0].size[2], outputBlobs[0].size[3], CV_32F, outputBlobs[0].ptr<float>(0, 0)),
            cv::Mat(outputBlobs[0].size[2], outputBlobs[0].size[3], CV_32F, outputBlobs[0].ptr<float>(0, 1)),
            cv::Mat(outputBlobs[0].size[2], outputBlobs[0].size[3], CV_32F, outputBlobs[0].ptr<float>(0, 2)),
        };

        auto prob = cv::Mat(outputBlobs[1].size[2], outputBlobs[1].size[3], CV_32F, outputBlobs[1].ptr<float>(0, 1));
        auto rotateProbs
            = cv::Mat(outputBlobs[2].size[2], outputBlobs[2].size[3], CV_32F, outputBlobs[2].ptr<float>(0, 1));

        float w = static_cast<float>(netSize) * curScale;
        for (int i = 0; i < prob.rows; i++) {
            for (int j = 0; j < prob.cols; j++) {
                if (float faceProbability = prob.at<float>(i, j); faceProbability > thres) {
                    float sn = regression[0].at<float>(i, j);
                    float xn = regression[1].at<float>(i, j);
                    float yn = regression[2].at<float>(i, j);

                    int rx = static_cast<int>(floor(
                        static_cast<float>(j) * curScale * static_cast<float>(stride_) - 0.5 * sn * w + sn * xn * w
                        + 0.5 * w + col));
                    int ry = static_cast<int>(floor(
                        static_cast<float>(i) * curScale * static_cast<float>(stride_) - 0.5 * sn * w + sn * yn * w
                        + 0.5 * w + row));

                    if (int rw = static_cast<int>(ceil(w * sn));
                        Legal(rx, ry, imgPad) && Legal(rx + rw - 1, ry + rw - 1, imgPad)) {
                        if (rotateProbs.at<float>(i, j) > 0.5)
                            winList.emplace_back(rx, ry, rw, rw, 0, curScale, faceProbability, m_minTrackAge);
                        else
                            winList.emplace_back(rx, ry, rw, rw, 180, curScale, faceProbability, m_minTrackAge);
                    }
                }
            }
        }
        imgResized = ResizeImg(imgResized, scale_);
        curScale = static_cast<float>(img.rows) / static_cast<float>(imgResized.rows);
    }
    return winList;
}

std::vector<Window2> Impl::Stage2(
    const cv::Mat& img, const cv::Mat& img180, cv::dnn::Net& net, float thres, int dim, std::vector<Window2>& winList)
    const
{
    if (winList.empty())
        return winList;
    std::vector<cv::Mat> dataList;
    dataList.reserve(winList.size());

    int height = img.rows;
    for (const Window2& window : winList) {
        if (abs(window.angle) < EPS)
            dataList.push_back(PreProcessImg(img(cv::Rect(window.x, window.y, window.w, window.h)), dim));
        else {
            int y2 = window.y + window.h - 1;
            dataList.push_back(PreProcessImg(img180(cv::Rect(window.x, height - 1 - y2, window.w, window.h)), dim));
        }
    }

    std::vector<cv::String> outputBlobNames = { "bbox_reg_2", "cls_prob", "rotate_cls_prob" };
    std::vector<cv::Mat> outputBlobs;
    std::vector<Window2> ret;

#if 0
    /* FIXME: Figure out how the reports from multiple images work so all images can be submitted at once */
    cv::Mat inputBlob = cv::dnn::blobFromImages(dataList, 1.0, cv::Size(), cv::Scalar(), false, false);
    net.setInput(inputBlob);
    net.forward(outputBlobs, outputBlobNames);

    for (size_t b = 0; b < outputBlobs.size(); b++) {
        std::cout << "Stage 2 output blob " << b << " is " << outputBlobs[b].dims << " dimensional" << std::endl;
        for (int d = 0; d < outputBlobs[b].dims; d++) {
            std::cout << "Dim " << d << " = " << outputBlobs[b].size[d] << std::endl;
        }
    }

    cv::Mat regression  = cv::Mat(outputBlobs[0].size[1], outputBlobs[0].size[0], CV_32F, outputBlobs[0].ptr<float>(0,0));
    cv::Mat prob        = cv::Mat(outputBlobs[1].size[1], outputBlobs[1].size[0], CV_32F, outputBlobs[1].ptr<float>(0,0));
    cv::Mat rotateProbs = cv::Mat(outputBlobs[2].size[1], outputBlobs[2].size[0], CV_32F, outputBlobs[2].ptr<float>(0,0));

    for (size_t i = 0; i < winList.size(); i++)
    {

        float score = prob.at<float>(1, i);

        if (score > thres)
        {
            float sn = regression.at<float>(i, 0);
            float xn = regression.at<float>(i, 1);
            float yn = regression.at<float>(i, 2);

            std::cout << "Candidate " << i << " score " << score << " [sn, xn, yn] = [" <<
                sn << ", " << xn << ", " << yn << "]" << std::endl;

            int cropX = winList[i].x;
            int cropY = winList[i].y;
            int cropW = winList[i].w;
            if (abs(winList[i].angle)  > EPS)
                cropY = height - 1 - (cropY + cropW - 1);
            int w = sn * cropW;
            int x = cropX  - 0.5 * sn * cropW + cropW * sn * xn + 0.5 * cropW;
            int y = cropY  - 0.5 * sn * cropW + cropW * sn * yn + 0.5 * cropW;
            float maxRotateScore = 0;
            int maxRotateIndex = 0;
            for (int j = 0; j < 3; j++)
            {
                float rotateScore = rotateProbs.at<float>(j, i);

                std::cout << "Candidate " << i << " rotate score " << j << " = " << rotateScore << std::endl;

                if (rotateScore > maxRotateScore)
                {
                    maxRotateScore = rotateScore;
                    maxRotateIndex = j;
                }
            }
            if (Legal(x, y, img) && Legal(x + w - 1, y + w - 1, img))
            {
                float angle = 0;
                if (abs(winList[i].angle)  < EPS)
                {
                    if (maxRotateIndex == 0)
                        angle = 90;
                    else if (maxRotateIndex == 1)
                        angle = 0;
                    else
                        angle = -90;
                    ret.push_back(Window2(x, y, w, w, angle, winList[i].scale, score, m_minTrackAge));
                }
                else
                {
                    if (maxRotateIndex == 0)
                        angle = 90;
                    else if (maxRotateIndex == 1)
                        angle = 180;
                    else
                        angle = -90;
                    ret.push_back(Window2(x, height - 1 -  (y + w - 1), w, w, angle, winList[i].scale, score, m_minTrackAge));
                }
            }
        }
    }
#else
    for (size_t i = 0; i < winList.size(); i++) {
        cv::Mat inputBlob = cv::dnn::blobFromImage(dataList[i], 1.0, cv::Size(), cv::Scalar(), false, false);
        net.setInput(inputBlob);
        net.forward(outputBlobs, outputBlobNames);

        auto regression
            = cv::Mat(outputBlobs[0].size[1], outputBlobs[0].size[0], CV_32F, outputBlobs[0].ptr<float>(0, 0));
        auto prob = cv::Mat(outputBlobs[1].size[1], outputBlobs[1].size[0], CV_32F, outputBlobs[1].ptr<float>(0, 0));
        auto rotateProbs
            = cv::Mat(outputBlobs[2].size[1], outputBlobs[2].size[0], CV_32F, outputBlobs[2].ptr<float>(0, 0));

        if (float score = prob.at<float>(1, 0); score > thres) {
            float sn = regression.at<float>(0, 0);
            float xn = regression.at<float>(1, 0);
            float yn = regression.at<float>(2, 0);

            int cropX = winList[i].x;
            int cropY = winList[i].y;
            int cropW = winList[i].w;
            if (abs(winList[i].angle) > EPS)
                cropY = height - 1 - (cropY + cropW - 1);
            int w = static_cast<int>(ceil(sn * static_cast<float>(cropW)));
            int x = static_cast<int>(floor(
                static_cast<float>(cropX) - 0.5f * sn * static_cast<float>(cropW + cropW) * sn * xn
                + 0.5f * static_cast<float>(cropW)));
            int y = static_cast<int>(floor(
                static_cast<float>(cropY) - 0.5f * sn * static_cast<float>(cropW + cropW) * sn * yn
                + 0.5f * static_cast<float>(cropW)));
            float maxRotateScore = 0;
            int maxRotateIndex = 0;
            for (int j = 0; j < 3; j++) {
                if (float rotateScore = rotateProbs.at<float>(j, 0); rotateScore > maxRotateScore) {
                    maxRotateScore = rotateScore;
                    maxRotateIndex = j;
                }
            }
            if (Legal(x, y, img) && Legal(x + w - 1, y + w - 1, img)) {
                float angle;
                if (abs(winList[i].angle) < EPS) {
                    if (maxRotateIndex == 0)
                        angle = 90;
                    else if (maxRotateIndex == 1)
                        angle = 0;
                    else
                        angle = -90;
                    ret.emplace_back(x, y, w, w, angle, winList[i].scale, score, m_minTrackAge);
                }
                else {
                    if (maxRotateIndex == 0)
                        angle = 90;
                    else if (maxRotateIndex == 1)
                        angle = 180;
                    else
                        angle = -90;
                    ret.emplace_back(x, height - 1 - (y + w - 1), w, w, angle, winList[i].scale, score, m_minTrackAge);
                }
            }
        }
    }
#endif
    return ret;
}

std::vector<Window2> Impl::Stage3(
    const cv::Mat& img,
    const cv::Mat& img180,
    const cv::Mat& img90,
    const cv::Mat& imgNeg90,
    cv::dnn::Net& net,
    float thres,
    int dim,
    std::vector<Window2>& winList) const
{
    if (winList.empty())
        return winList;
    std::vector<cv::Mat> dataList;
    int height = img.rows;
    int width = img.cols;
    for (const Window2& window : winList) {
        if (abs(window.angle) < EPS)
            dataList.push_back(PreProcessImg(img(cv::Rect(window.x, window.y, window.w, window.h)), dim));
        else if (abs(window.angle - 90) < EPS) {
            dataList.push_back(PreProcessImg(img90(cv::Rect(window.y, window.x, window.h, window.w)), dim));
        }
        else if (abs(window.angle + 90) < EPS) {
            int x = window.y;
            int y = width - 1 - (window.x + window.w - 1);
            dataList.push_back(PreProcessImg(imgNeg90(cv::Rect(x, y, window.w, window.h)), dim));
        }
        else {
            int y2 = window.y + window.h - 1;
            dataList.push_back(PreProcessImg(img180(cv::Rect(window.x, height - 1 - y2, window.w, window.h)), dim));
        }
    }

    std::vector<cv::String> outputBlobNames = { "bbox_reg_3", "cls_prob", "rotate_reg_3" };
    std::vector<cv::Mat> outputBlobs;
    std::vector<Window2> ret;

    for (size_t i = 0; i < winList.size(); i++) {
        cv::Mat inputBlob = cv::dnn::blobFromImage(dataList[i], 1.0, cv::Size(), cv::Scalar(), false, false);
        net.setInput(inputBlob);
        net.forward(outputBlobs, outputBlobNames);

        auto regression
            = cv::Mat(outputBlobs[0].size[1], outputBlobs[0].size[0], CV_32F, outputBlobs[0].ptr<float>(0, 0));
        auto prob = cv::Mat(outputBlobs[1].size[1], outputBlobs[1].size[0], CV_32F, outputBlobs[1].ptr<float>(0, 0));
        auto rotateProbs
            = cv::Mat(outputBlobs[2].size[1], outputBlobs[2].size[0], CV_32F, outputBlobs[2].ptr<float>(0, 0));

        if (float score = prob.at<float>(1, 0); score > thres) {
            float sn = regression.at<float>(0, 0);
            float xn = regression.at<float>(1, 0);
            float yn = regression.at<float>(2, 0);

            int cropX = winList[i].x;
            int cropY = winList[i].y;
            int cropW = winList[i].w;
            cv::Mat imgTmp = img;
            if (abs(winList[i].angle - 180) < EPS) {
                cropY = height - 1 - (cropY + cropW - 1);
                imgTmp = img180;
            }
            else if (abs(winList[i].angle - 90) < EPS) {
                std::swap(cropX, cropY);
                imgTmp = img90;
            }
            else if (abs(winList[i].angle + 90) < EPS) {
                cropX = winList[i].y;
                cropY = width - 1 - (winList[i].x + winList[i].w - 1);
                imgTmp = imgNeg90;
            }

            int w = static_cast<int>(ceil(sn * static_cast<float>(cropW)));
            int x
                = static_cast<int>(floor(cropX - 0.5 * sn * static_cast<float>(cropW + cropW) * sn * xn + 0.5 * cropW));
            int y
                = static_cast<int>(floor(cropY - 0.5 * sn * static_cast<float>(cropW + cropW) * sn * yn + 0.5 * cropW));
            float angle = angleRange_ * rotateProbs.at<float>(0, 0);

            if (Legal(x, y, imgTmp) && Legal(x + w - 1, y + w - 1, imgTmp)) {
                if (abs(winList[i].angle) < EPS)
                    ret.emplace_back(x, y, w, w, angle, winList[i].scale, score, m_minTrackAge);
                else if (abs(winList[i].angle - 180) < EPS) {
                    ret.emplace_back(
                        x, height - 1 - (y + w - 1), w, w, 180 - angle, winList[i].scale, score, m_minTrackAge);
                }
                else if (abs(winList[i].angle - 90) < EPS) {
                    ret.emplace_back(y, x, w, w, 90 - angle, winList[i].scale, score, m_minTrackAge);
                }
                else {
                    ret.emplace_back(width - y - w, x, w, w, -90 + angle, winList[i].scale, score, m_minTrackAge);
                }
            }
        }
    }

    return ret;
}

std::vector<Window> Impl::TransWindow(const cv::Mat& img, const cv::Mat& imgPad, std::vector<Window2>& winList)
{
    const int row = (imgPad.rows - img.rows) / 2;
    const int col = (imgPad.cols - img.cols) / 2;

    std::vector<Window> ret;
    for (Window2& window : winList) {
        if (window.w > 0 && window.h > 0) {
            for (cv::Point& point : window.points14) {
                point.x -= col;
                point.y -= row;
            }
            ret.emplace_back(
                window.x - col,
                window.y - row,
                window.w,
                static_cast<int>(round(window.angle)),
                window.conf,
                window.points14);
        }
    }
    return ret;
}

std::vector<Window2> Impl::SmoothWindow(std::vector<Window2> winList)
{
    for (Window2& window : winList) {
        for (Window2& smooth : m_smoothPreList) {
            if (IoU(window, smooth) > 0.9) {
                window.conf = (window.conf + smooth.conf) / 2;
                window.x = smooth.x;
                window.y = smooth.y;
                window.w = smooth.w;
                window.h = smooth.h;
                window.angle = smooth.angle;
                for (size_t k = 0; k < smooth.points14.size(); k++) {
                    window.points14[k].x = (4 * window.points14[k].x + 6 * smooth.points14[k].x) / 10;
                    window.points14[k].y = (4 * window.points14[k].y + 6 * smooth.points14[k].y) / 10;
                }
                smooth.age = 0;
            }
            else if (IoU(window, smooth) > 0.6) {
                window.conf = (window.conf + smooth.conf) / 2;
                window.x = (window.x + smooth.x) / 2;
                window.y = (window.y + smooth.y) / 2;
                window.w = (window.w + smooth.w) / 2;
                window.h = (window.h + smooth.h) / 2;
                window.angle = SmoothAngle(window.angle, smooth.angle);
                for (size_t k = 0; k < smooth.points14.size(); k++) {
                    window.points14[k].x = (7 * window.points14[k].x + 3 * smooth.points14[k].x) / 10;
                    window.points14[k].y = (7 * window.points14[k].y + 3 * smooth.points14[k].y) / 10;
                }
                smooth.age = 0;
            }
        }
    }
    for (Window2& smooth : m_smoothPreList) {
        if (smooth.age > 0) {
            smooth.age--;
            winList.push_back(smooth);
        }
    }

    m_smoothPreList = winList;
    return winList;
}

std::vector<Window2> Impl::Detect(const cv::Mat& img, const cv::Mat& imgPad)
{
    cv::Mat img180, img90, imgNeg90;
    flip(imgPad, img180, 0);
    transpose(imgPad, img90);
    flip(img90, imgNeg90, 0);

    std::vector<Window2> winList = Stage1(img, imgPad, net_[0], classThreshold_[0]);
    winList = NMS(winList, true, nmsThreshold_[0]);

    winList = Stage2(imgPad, img180, net_[1], classThreshold_[1], 24, winList);
    winList = NMS(winList, true, nmsThreshold_[1]);

    winList = Stage3(imgPad, img180, img90, imgNeg90, net_[2], classThreshold_[2], 48, winList);
    winList = NMS(winList, false, nmsThreshold_[2]);
    winList = DeleteFP(winList);
    return winList;
}

std::vector<Window2> Impl::Track(
    const cv::Mat& img, cv::dnn::Net& net, float thres, int dim, std::vector<Window2>& winList) const
{
    std::vector<cv::String> outputBlobNames = { "bbox_reg", "cls_prob", "points_reg", "rotate_reg" };

    if (winList.empty())
        return winList;
    std::vector<Window> tmpWinList;
    for (const Window2& window : winList) {
        Window win(
            static_cast<int>(floor(static_cast<float>(window.x) - augScale_ * static_cast<float>(window.w))),
            static_cast<int>(floor(static_cast<float>(window.y) - augScale_ * static_cast<float>(window.w))),
            static_cast<int>(ceil(static_cast<float>(window.w) + 2 * augScale_ * static_cast<float>(window.w))),
            static_cast<int>(round(window.angle)),
            window.conf,
            window.points14);
        tmpWinList.push_back(win);
    }
    std::vector<cv::Mat> dataList;
    dataList.reserve(tmpWinList.size());
    for (Window& tmp : tmpWinList) {
        dataList.push_back(PreProcessImg(CropFace(img, tmp, dim), dim));
    }

    std::vector<cv::Mat> outputBlobs;

    std::vector<Window2> ret;

    for (size_t i = 0; i < tmpWinList.size(); i++) {
        cv::Mat inputBlob = cv::dnn::blobFromImage(dataList[i], 1.0, cv::Size(), cv::Scalar(), false, false);

        net.setInput(inputBlob);
        net.forward(outputBlobs, outputBlobNames);

        auto regression
            = cv::Mat(outputBlobs[0].size[1], outputBlobs[0].size[0], CV_32F, outputBlobs[0].ptr<float>(0, 0));
        auto prob = cv::Mat(outputBlobs[1].size[1], outputBlobs[1].size[0], CV_32F, outputBlobs[1].ptr<float>(0, 0));
        auto pointsRegression
            = cv::Mat(outputBlobs[2].size[1], outputBlobs[2].size[0], CV_32F, outputBlobs[2].ptr<float>(0, 0));
        auto rotateProbs
            = cv::Mat(outputBlobs[3].size[1], outputBlobs[3].size[0], CV_32F, outputBlobs[3].ptr<float>(0, 0));

        if (float score = prob.at<float>(1, 0); score > thres) {
            auto cropX = static_cast<float>(tmpWinList[i].x);
            auto cropY = static_cast<float>(tmpWinList[i].y);
            auto cropW = static_cast<float>(tmpWinList[i].width);
            float centerX = (2.0f * cropX + cropW - 1) / 2.0f;
            float centerY = (2.0f * cropY + cropW - 1) / 2.0f;
            std::vector<cv::Point> points14;
            points14.reserve(pointsRegression.rows / 2);
            for (int j = 0; j < pointsRegression.rows / 2; j++) {
                points14.push_back(RotatePoint(
                    (pointsRegression.at<float>(2 * j, 0) + 0.5f) * (cropW - 1) + cropX,
                    (pointsRegression.at<float>(2 * j + 1, 0) + 0.5f) * (cropW - 1) + cropY,
                    centerX,
                    centerY,
                    static_cast<float>(tmpWinList[i].angle)));
            }

            float sn = regression.at<float>(0, 0);
            float xn = regression.at<float>(0, 1);
            float yn = regression.at<float>(0, 2);
            float theta = -static_cast<float>(tmpWinList[i].angle) * static_cast<float>(M_PI) / 180.0f;
            int w = static_cast<int>(ceil(sn * cropW));
            int x = static_cast<int>(floor(
                cropX - 0.5f * sn * cropW + cropW * sn * xn * std::cos(theta) - cropW * sn * yn * std::sin(theta)
                + 0.5f * cropW));
            int y = static_cast<int>(floor(
                cropY - 0.5f * sn * cropW + cropW * sn * xn * std::sin(theta) + cropW * sn * yn * std::cos(theta)
                + 0.5f * cropW));

            float angle = angleRange_ * rotateProbs.at<float>(0, 0);
            if (thres > 0) {
                if (Legal(x, y, img) && Legal(x + w - 1, y + w - 1, img)) {
                    float tmpW = static_cast<float>(w) / (1 + 2 * augScale_);
                    if (int tmpW_pixels = static_cast<int>(ceil(tmpW)); tmpW_pixels >= 20) {
                        ret.emplace_back(
                            x + static_cast<int>(augScale_ * tmpW),
                            y + static_cast<int>(augScale_ * tmpW),
                            tmpW_pixels,
                            tmpW_pixels,
                            winList[i].angle + angle,
                            winList[i].scale,
                            score,
                            m_minTrackAge);
                        ret[ret.size() - 1].points14 = points14;
                    }
                }
            }
            else {
                float tmpW = static_cast<float>(w) / (1 + 2 * augScale_);
                int tmpW_pixels = static_cast<int>(ceil(tmpW));
                ret.emplace_back(
                    x + static_cast<int>(augScale_ * tmpW),
                    y + static_cast<int>(augScale_ * tmpW),
                    tmpW_pixels,
                    tmpW_pixels,
                    winList[i].angle + angle,
                    winList[i].scale,
                    score,
                    m_minTrackAge);
                ret[ret.size() - 1].points14 = points14;
            }
        }
    }
    return ret;
}

cv::Point RotatePoint(float x, float y, const float centerX, const float centerY, const float angle)
{
    x -= centerX;
    y -= centerY;
    const float theta = -angle * static_cast<float>(M_PI) / 180.0f;
    int rx = static_cast<int>(round(centerX + x * std::cos(theta) - y * std::sin(theta)));
    int ry = static_cast<int>(round(centerY + x * std::sin(theta) + y * std::cos(theta)));
    return { rx, ry };
}

void DrawLine(cv::Mat img, const std::vector<cv::Point>& pointList)
{
    constexpr int width = 2;
    line(img, pointList[0], pointList[1], CYAN, width);
    line(img, pointList[1], pointList[2], CYAN, width);
    line(img, pointList[2], pointList[3], CYAN, width);
    line(img, pointList[3], pointList[0], BLUE, width);
}

void DrawFace(const cv::Mat& img, const Window& face)
{
    const auto x1 = static_cast<float>(face.x);
    const auto y1 = static_cast<float>(face.y);
    const auto x2 = static_cast<float>(face.width + face.x - 1);
    const auto y2 = static_cast<float>(face.width + face.y - 1);
    const float centerX = (x1 + x2) / 2;
    const float centerY = (y1 + y2) / 2;
    std::vector<cv::Point> pointList;
    pointList.push_back(RotatePoint(x1, y1, centerX, centerY, static_cast<float>(face.angle)));
    pointList.push_back(RotatePoint(x1, y2, centerX, centerY, static_cast<float>(face.angle)));
    pointList.push_back(RotatePoint(x2, y2, centerX, centerY, static_cast<float>(face.angle)));
    pointList.push_back(RotatePoint(x2, y1, centerX, centerY, static_cast<float>(face.angle)));
    DrawLine(img, pointList);
}

void DrawPoints(cv::Mat img, const Window& face)
{
    if (face.points14.size() == 14) {
        constexpr int width = 2;
        for (int i = 1; i <= 8; i++) {
            line(img, face.points14[i - 1], face.points14[i], BLUE, width);
        }
        for (size_t i = 0; i < face.points14.size(); i++) {
            if (i <= 8)
                circle(img, face.points14[i], width, CYAN, -1);
            else if (i <= 9)
                circle(img, face.points14[i], width, GREEN, -1);
            else if (i <= 11)
                circle(img, face.points14[i], width, PURPLE, -1);
            else
                circle(img, face.points14[i], width, RED, -1);
        }
    }
}

cv::Mat CropFace(const cv::Mat& img, const Window& face, const int cropSize)
{
    const auto x1 = static_cast<float>(face.x);
    const auto y1 = static_cast<float>(face.y);
    const auto x2 = static_cast<float>(face.width + face.x - 1);
    const auto y2 = static_cast<float>(face.width + face.y - 1);
    const float centerX = (x1 + x2) / 2.0f;
    const float centerY = (y1 + y2) / 2.0f;
    cv::Point2f srcTriangle[3];
    cv::Point2f dstTriangle[3];
    srcTriangle[0] = RotatePoint(x1, y1, centerX, centerY, static_cast<float>(face.angle));
    srcTriangle[1] = RotatePoint(x1, y2, centerX, centerY, static_cast<float>(face.angle));
    srcTriangle[2] = RotatePoint(x2, y2, centerX, centerY, static_cast<float>(face.angle));
    dstTriangle[0] = cv::Point(0, 0);
    dstTriangle[1] = cv::Point(0, cropSize - 1);
    dstTriangle[2] = cv::Point(cropSize - 1, cropSize - 1);
    const cv::Mat rotMat = getAffineTransform(srcTriangle, dstTriangle);
    cv::Mat ret;
    warpAffine(img, ret, rotMat, cv::Size(cropSize, cropSize));
    return ret;
}
