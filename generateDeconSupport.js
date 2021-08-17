/*

generateDeconSupport.js: Generate support for deconvolution.
================================================================================
This script implements my workflow for deconvolution. It will create:

   1. An extracted luminance view for PSF generation
   2. A stretched luminance mask to support generation of other masks
   3. An advanced star mask using StarNet++
   4. A saturation mask to hide oversaturated stars from PSF generation
   5. A deconvolution support mask in case global de-ringing falls short

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

#feature-id    DeepSkyWorkflows > GenerateDeconSupport

#define TITLE "Generate Decon Support"

#ifndef DEBUG_GDS
#define DEBUG_GDS false
#endif

#ifndef FEATURE
#define FEATURE "generateDeconSupport"
#endif

#include "deepSkyCommon.js"
#include "./generateDeconSupport/engine.js"
#include "./generateDeconSupport/ui.js"

(function (ds) {

   ds.debug.register(FEATURE, DEBUG_GDS);
   ds.debug[FEATURE].debugLn(TITLE, 'debugging is on.');

   ds.features.register(FEATURE, deconEngine, { masks: {} });

   ds.debug[FEATURE].debugLn(
      'Registered feature: ',
      JSON.stringify(ds.features[FEATURE]));

   let bootstrap = ds.engine.bootstrap([
      {
         setting: "generateDeconSupport",
         dataType: DataType_Boolean,
         defaultValue: true,
         label: "Generate deconvolution support mask",
         tooltip: "Choose whether or not to generate the support mask."
      },
      {
         setting: "generateSaturationMask",
         dataType: DataType_Boolean,
         defaultValue: true,
         label: "Generate saturation mask",
         tooltip: "Choose whether or not to generate the mask for PSF support. Disable if you use a script."
      },
      {
         setting: "launchDeconProcess",
         dataType: DataType_Boolean,
         defaultValue: true,
         label: "Launch deconvolution proceess",
         tooltip: "Choose whether or not to launch deconvolution with defaults."
      },
      {
         setting: "launchDynamicPSF",
         dataType: DataType_Boolean,
         defaultValue: true,
         label: "Launch dynamic PSF proceess",
         tooltip: "Choose whether or not to launch dynamic PSF."
      },
      {
         setting: "saturationLimit",
         dataType: DataType_Double,
         defaultValue: 0.8,
         label: "Saturation limit:",
         precision: 3,
         tooltip: "Choose the saturation limit for generating the PSF model.",
         range: { low: 0.4, high: 0.999 }
      },
      {
         setting: "growIterations",
         dataType: DataType_Int16,
         defaultValue: 3,
         precision: 0,
         label: "Iterations to grow star mask:",
         tooltip: "Choose how many times to dilate the star mask. 0 for none.",
         range: { low: 0, high: 5 }
      },
      {
         setting: "blurStars",
         dataType: DataType_Boolean,
         defaultValue: true,
         label: "Blur star mask",
         tooltip: "Choose whether or not to apply convolution to the star mask."
      },
      {
         setting: "extractLum",
         dataType: DataType_Boolean,
         defaultValue: true,
         label: "Extract luminance",
         tooltip: "Extract luminance or select existing view."
      },
      {
         setting: "generateLumMask",
         dataType: DataType_Boolean,
         defaultValue: true,
         label: "Generate luminance mask",
         tooltip: "Generate the luminance mask or select existing view."
      }
   ],
      ds.features[FEATURE].engine.doDecon,
      function () {
         ds.debug[FEATURE].debugLn('New dialog requested.');
         return ds.ui.createDialog(gdsDialog);
      },
      FEATURE,
      false);

   bootstrap();
   ds.features[FEATURE].engine.validate();
})(deepSky);
