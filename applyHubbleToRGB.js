/*

applyHubbletoRGB.js: Simulation of the "Hubble palette."
================================================================================

Transforms red, "smoky" nebula to blueish with higher contrast.
================================================================================
 *
 *
 * Copyright Jeremy Likness, 2021
 *
 * License: https://github.com/DeepSkyWorkflows/DeepSkyWorkflowScripts/LICENSE
 *
 * Source: https://github.com/DeepSkyWorkflows/DeepSkyWorkflowScripts
 *
 * mailTo:deepskyworkflows@gmail.com
 *
 */

#feature-id    DeepSkyWorkflows > ApplyHubbleToRGB

#define TITLE "Apply Hubble Palette to RGB"
#define FEATURE "applyHubbleToRGB"
#define DEBUG_AH false

#include "deepSkyCommon.js"
#include "applyHubbleToRGB/engine.js"
#include "applyHubbleToRGB/ui.js"

(function (ds) {

   ds.debug.register(FEATURE, DEBUG_AH);
   ds.debug[FEATURE].debugLn(TITLE, 'debugging is on.');

   ds.features.register(FEATURE, TITLE, hubbleEngine, { data: { toClose: [] }});

   ds.debug[FEATURE].debugLn(
      'Registered feature: ',
      JSON.stringify(ds.features[FEATURE]));

   let bootstrap = ds.engine.bootstrap([
      {
         setting: "redChannelStrength",
         dataType: DataType_Double,
         defaultValue: 0.7,
         label: "Main:",
         precision: 3,
         tooltip: "Percentage of red or synthetic channel. Difference goes to green channel",
         range: { low: 0.51, high: 0.9 }
      },
      {
         setting: "otherChannelStrength",
         dataType: DataType_Double,
         defaultValue: 0.3,
         label: "Green:",
         precision: 3,
         range: { low: 0.1, high: 0.49 }
      },
      {
         setting: "createSyntheticRedBlueChannel",
         dataType: DataType_Boolean,
         defaultValue: true,
         label: "Create synthetic channel",
         tooltip: "Creates a synthetic channel by subtracting blue from red"
      },
      {
         setting: "preserveOriginal",
         dataType: DataType_Boolean,
         defaultValue: true,
         label: "Preserve original image",
         tooltip: "If checked, the operations will be performed on a clone"
      },
      {
         setting: "closeIntermediateImages",
         dataType: DataType_Boolean,
         defaultValue: true,
         label: "Close intermediate images",
         tooltip: "If checked the intermediate views will be closed"
      }],
      ds.features[FEATURE].engine.doApply,
      function () {
         ds.debug[FEATURE].debugLn('New dialog requested.');
         return ds.ui.createDialog(hubbleDialog);
      },
      FEATURE,
      false);

   bootstrap();
})(deepSky);