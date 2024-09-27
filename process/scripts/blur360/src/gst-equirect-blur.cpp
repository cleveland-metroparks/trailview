#include "gst-equirect-blur.h"

GST_DEBUG_CATEGORY_STATIC(gst_equirect_blur_debug);
#define GST_CAT_DEFAULT gst_equirect_blur_debug

enum { PROP_0, PROP_DRAW_OVER_FACES, PROP_MODELS_DIR };

#define DEFAULT_DRAW_OVER_FACES TRUE
#define DEFAULT_MODELS_DIR "models"

static GstStaticPadTemplate sink_template
    = GST_STATIC_PAD_TEMPLATE("sink", GST_PAD_SINK, GST_PAD_ALWAYS, GST_STATIC_CAPS("video/x-raw,format=(string)BGR"));

static GstStaticPadTemplate src_template
    = GST_STATIC_PAD_TEMPLATE("src", GST_PAD_SRC, GST_PAD_ALWAYS, GST_STATIC_CAPS("video/x-raw,format=(string)BGR"));

#define gst_equirect_blur_parent_class parent_class
G_DEFINE_TYPE(GstEquirectBlur, gst_equirect_blur, GST_TYPE_VIDEO_FILTER);

// ReSharper disable once CppFunctionIsNotImplemented
static gboolean gst_equirect_blur_set_info(
    GstVideoFilter* vfilter, GstCaps* incaps, GstVideoInfo* in_info, GstCaps* outcaps, GstVideoInfo* out_info);

static void gst_equirect_blur_set_property(GObject* object, guint prop_id, const GValue* value, GParamSpec* pspec);
static void gst_equirect_blur_get_property(GObject* object, guint prop_id, GValue* value, GParamSpec* pspec);
static void gst_equirect_blur_finalize(GObject* object);

static GstFlowReturn gst_equirect_blur_transform_frame_ip(GstVideoFilter* base, GstVideoFrame* frame);

static void gst_equirect_blur_class_init(GstEquirectBlurClass* klass)
{
    auto* gobject_class = reinterpret_cast<GObjectClass*>(klass);
    auto* gstelement_class = reinterpret_cast<GstElementClass*>(klass);

    gobject_class->finalize = gst_equirect_blur_finalize;
    gobject_class->set_property = gst_equirect_blur_set_property;
    gobject_class->get_property = gst_equirect_blur_get_property;

    g_object_class_install_property(
        gobject_class,
        PROP_DRAW_OVER_FACES,
        g_param_spec_boolean(
            "draw-over-faces",
            "Draw over faces",
            "Draw grey rectangles over faces if TRUE. Blur them if FALSE",
            DEFAULT_DRAW_OVER_FACES,
            static_cast<GParamFlags>(G_PARAM_READWRITE | G_PARAM_STATIC_STRINGS)));

    g_object_class_install_property(
        gobject_class,
        PROP_MODELS_DIR,
        g_param_spec_string(
            "models-dir",
            "Models directory",
            "Path to PCN models directory",
            DEFAULT_MODELS_DIR,
            static_cast<GParamFlags>(G_PARAM_READWRITE | G_PARAM_STATIC_STRINGS)));

    gst_element_class_set_details_simple(
        gstelement_class,
        "Equirectangular Face Blur Filter",
        "Video/Filter",
        "Face blurring for equirectangular video",
        "Jan Schmidt <jan@centricular.com>");

    gst_element_class_add_pad_template(gstelement_class, gst_static_pad_template_get(&src_template));
    gst_element_class_add_pad_template(gstelement_class, gst_static_pad_template_get(&sink_template));

    GST_VIDEO_FILTER_CLASS(klass)->set_info = gst_equirect_blur_set_info;
    GST_VIDEO_FILTER_CLASS(klass)->transform_frame_ip = gst_equirect_blur_transform_frame_ip;

    GST_DEBUG_CATEGORY_INIT(gst_equirect_blur_debug, "equirectblur", 0, "Equirectangular Face Blurring filter");
}

static void gst_equirect_blur_init(GstEquirectBlur* self)
{
    self->models_dir = g_strdup(DEFAULT_MODELS_DIR);
    self->draw_over_faces = DEFAULT_DRAW_OVER_FACES;
}

static void gst_equirect_blur_finalize(GObject* object)
{
    GstEquirectBlur* filter = GST_EQUIRECT_BLUR(object);
    filter->cvMat.release();

    g_free(filter->models_dir);

    G_OBJECT_CLASS(parent_class)->finalize(object);
}

static void gst_equirect_blur_set_property(GObject* object, const guint prop_id, const GValue* value, GParamSpec* pspec)
{
    GstEquirectBlur* filter = GST_EQUIRECT_BLUR(object);

    switch (prop_id) {
    case PROP_DRAW_OVER_FACES:
        filter->draw_over_faces = g_value_get_boolean(value);
        break;
    case PROP_MODELS_DIR:
        GST_OBJECT_LOCK(object);
        g_free(filter->models_dir);
        filter->models_dir = g_value_dup_string(value);
        GST_OBJECT_UNLOCK(object);
        break;
    default:
        G_OBJECT_WARN_INVALID_PROPERTY_ID(object, prop_id, pspec);
        break;
    }
}

static void gst_equirect_blur_get_property(GObject* object, const guint prop_id, GValue* value, GParamSpec* pspec)
{
    const GstEquirectBlur* filter = GST_EQUIRECT_BLUR(object);

    switch (prop_id) {
    case PROP_DRAW_OVER_FACES:
        g_value_set_boolean(value, filter->draw_over_faces);
        break;
    case PROP_MODELS_DIR:
        GST_OBJECT_LOCK(object);
        g_value_set_string(value, filter->models_dir);
        GST_OBJECT_UNLOCK(object);
        break;
    default:
        G_OBJECT_WARN_INVALID_PROPERTY_ID(object, prop_id, pspec);
        break;
    }
}
static gboolean gst_equirect_blur_set_info(
    GstVideoFilter* vfilter,
    GstCaps* incaps,
    // ReSharper disable once CppParameterMayBeConstPtrOrRef
    GstVideoInfo* in_info,
    GstCaps* outcaps,
    GstVideoInfo* out_info)
{
    GstEquirectBlur* filter = GST_EQUIRECT_BLUR(vfilter);

    filter->width = GST_VIDEO_INFO_WIDTH(in_info);
    filter->height = GST_VIDEO_INFO_HEIGHT(in_info);

    filter->cvMat.create(filter->height, filter->width, CV_8UC3);
    filter->update_projections = TRUE;

    gst_base_transform_set_in_place(GST_BASE_TRANSFORM(filter), TRUE);
    return TRUE;
}

static void gst_equirect_blur_prepare_projections(GstEquirectBlur* filter)
{
    /* Prepare cropped projection maps for processing */
    GST_INFO_OBJECT(filter, "Compiling detectors for size %d x %d", filter->width, filter->height);

    const cv::Size image_size(filter->width, filter->height);

    float apertures[2] = { X_APERTURE, Y_APERTURE };

    GST_OBJECT_LOCK(GST_OBJECT(filter));
    const auto models_dir = cv::String(filter->models_dir);
    GST_OBJECT_UNLOCK(GST_OBJECT(filter));

#pragma omp parallel for // NOLINT(*-use-default-none)
    for (int phi_step = 0; phi_step < static_cast<int>((M_PI / Y_STEP)); phi_step++) {
        const float phi_full = static_cast<float>(phi_step) * Y_STEP;
        /* Calculate a phi (vertical tilt) from -M_PI/2 to M_PI/2 */
        const float phi = phi_full <= M_PI / 2 ? phi_full : phi_full - static_cast<float>(M_PI);

        for (float lambda = 0; lambda < 2 * M_PI; lambda += X_STEP) { // NOLINT(*-flp30-c)
            const auto detector = new PCN(
                models_dir + "/PCN.caffemodel",
                models_dir + "/PCN-1.prototxt",
                models_dir + "/PCN-2.prototxt",
                models_dir + "/PCN-3.prototxt",
                models_dir + "/PCN-Tracking.caffemodel",
                models_dir + "/PCN-Tracking.prototxt");

            /// detection
            detector->SetMinFaceSize(32);
            detector->SetImagePyramidScaleFactor(1.5f);
            // detector->SetDetectionThresh(0.37f, 0.43f, 0.85f); // default
            // detector->SetDetectionThresh(0.28f, 0.32f, 0.64f); // More blur
            detector->SetDetectionThresh(0.56f, 0.65f, 1.274f);
            /// tracking
            detector->SetTrackingPeriod(30);
            detector->SetTrackingThresh(0.9f);
            detector->SetVideoSmooth(true);

            Projection projection(image_size, apertures, phi, lambda, detector);

#pragma omp critical
            filter->projections.push_back(projection);
        }
    }

    g_print(
        "Created %u projections of %u x %u\n",
        static_cast<int>(filter->projections.size()),
        static_cast<int>((M_PI / Y_STEP)),
        static_cast<int>(2 * M_PI / X_STEP + 1));
    g_assert(filter->projections.size() == static_cast<int>(M_PI / Y_STEP) * static_cast<int>(2 * M_PI / X_STEP + 1));
}

// ReSharper disable once CppParameterMayBeConstPtrOrRef
static GstFlowReturn gst_equirect_blur_transform_frame_ip(GstVideoFilter* base, GstVideoFrame* frame)
{
    GstEquirectBlur* filter = GST_EQUIRECT_BLUR(base);

    if (filter->update_projections) {
        gst_equirect_blur_prepare_projections(filter);
        filter->update_projections = FALSE;
    }

    GST_DEBUG_OBJECT(filter, "Processing frame");
    filter->cvMat.data = static_cast<unsigned char*>(frame->data[0]);
    filter->cvMat.datastart = static_cast<unsigned char*>(frame->data[0]);

    if (!equirect_blur_process_frame(filter->cvMat, filter->projections, filter->draw_over_faces)) {
        GST_ERROR_OBJECT(filter, "Processing frame failed");
        return GST_FLOW_ERROR;
    }

    return GST_FLOW_OK;
}

gboolean gst_equirect_blur_register(void)
{
    return gst_element_register(nullptr, "equirect_blur", GST_RANK_NONE, GST_TYPE_EQUIRECT_BLUR);
}
