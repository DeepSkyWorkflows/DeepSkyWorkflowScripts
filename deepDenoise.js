/*

deepDenoise.js: Denoise a linear (non-stretched) image.
================================================================================
This script implements my workflow for deconvolution. It will:

   1. Create an extracted and stretched luminance mask modified for denoise
   2. Apply a multiscale linear transform to the luminance channel
   2. Apply a multiscale linear transform to the chrominance channel
   
================================================================================
 *
 *
 * Copyright Jeremy Likness, 2021
 *
 * License: https://github.com/DeepSkyWorkflows/DeepSkyWorkflowScripts/LICENSE
 *
 * Source: https://github.com/DeepSkyWorkflows/DeepSkyWorkflowScripts/
 *
 *
 * mailTo:deepskyworkflows@gmail.com
 */

#feature-id    DeepSkyWorkflows > DeepDenoise

#define TITLE "Deep Denoise"
#define DEBUG_DD false
#define FEATURE "deepDenoise"

#include "deepSkyCommon.js"
#include "./deepDenoise/engine.js"
#include "./deepDenoise/ui.js"

(function (ds) {

   ds.debug.register(FEATURE, DEBUG_DD);
   ds.debug[FEATURE].debugLn(TITLE, 'debugging is on.');

   ds.features.register(FEATURE, TITLE, denoiseEngine, { masks: {} });

   ds.debug[FEATURE].debugLn(
      'Registered feature: ',
      JSON.stringify(ds.features[FEATURE]));

   let bootstrap = ds.engine.bootstrap([
    {
        setting: "maskStrength",
        dataType: DataType_Int16,
        defaultValue: 5,
        precision: 0,
        label: "Strength of luminance mask:",
        tooltip: "A higher strength will protect more structures.",
        range: { low: 1, high: 10 }
     },
     {
         setting: "applyToLuminance",
         dataType: DataType_Boolean,
         defaultValue: true,
         label: "Apply to luminance",
         tooltip: "Choose whether or not to run denoise against luminance."
      },
      {
        setting: "lumMaxThreshold",
        dataType: DataType_Int16,
        defaultValue: 6,
        precision: 0,
        label: "Threshold for luminance denoise:",
        tooltip: "A higher level will remove more structures as noise.",
        range: { low: 1, high: 40 }
     },
     {
        setting: "lumNumLayers",
        dataType: DataType_Int16,
        defaultValue: 6,
        precision: 0,
        label: "Number of layers (out of 8) of luminance to apply denoise to:",
        tooltip: "Number of wavelet layers affected.",
        range: { low: 1, high: 8 }
     },
     {
         setting: "lumMaxAmount",
         dataType: DataType_Double,
         defaultValue: 0.5,
         label: "Max amount to apply:",
         precision: 2,
         tooltip: "Choose the maximum percentage of luminance denoise to apply.",
         range: { low: 0.1, high: 0.99 }
      },
      {
        setting: "applyToChrominance",
        dataType: DataType_Boolean,
        defaultValue: true,
        label: "Apply to chrominance",
        tooltip: "Choose whether or not to run denoise against chrominance."
     },
     {
       setting: "chromMaxThreshold",
       dataType: DataType_Int16,
       defaultValue: 6,
       precision: 0,
       label: "Threshold for chrominance denoise:",
       tooltip: "A higher level will remove more structures as noise.",
       range: { low: 1, high: 40 }
    },
    {
       setting: "chromNumLayers",
       dataType: DataType_Int16,
       defaultValue: 6,
       precision: 0,
       label: "Number of layers (out of 8) of chrominance to apply denoise to:",
       tooltip: "Number of wavelet layers affected.",
       range: { low: 1, high: 8 }
    },
    {
        setting: "chromMaxAmount",
        dataType: DataType_Double,
        defaultValue: 0.5,
        label: "Max amount to apply:",
        precision: 2,
        tooltip: "Choose the maximum percentage of chrominance denoise to apply.",
        range: { low: 0.1, high: 0.99 }
     },
     {
        setting: "applyLuminanceFirst",
        dataType: DataType_Boolean,
        defaultValue: true,
        label: "Apply to luminance first?",
        tooltip: "Choose whether or not to run denoise against luminance first or chrominance."
     }      
   ],
      ds.features[FEATURE].engine.doDenoise,
      function () {
         ds.debug[FEATURE].debugLn('New dialog requested.');
         return ds.ui.createDialog(denoiseDialog);
      },
      FEATURE,
      false);

   bootstrap();
   ds.features[FEATURE].engine.validate();
})(deepSky);
