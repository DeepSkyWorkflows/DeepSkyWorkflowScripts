/*

stretch.js: Stretch a linear image.
================================================================================
This script applies a Screen Transfer Function followed by a Histogram Transformation
to stretch your mage.   
================================================================================
 *
 *
 * Copyright Jeremy Likness, 2022
 *
 * License: https://github.com/DeepSkyWorkflows/DeepSkyWorkflowScripts/LICENSE
 *
 * Source: https://github.com/DeepSkyWorkflows/DeepSkyWorkflowScripts/
 *
 *
 * mailTo:deepskyworkflows@gmail.com
 */

#feature-id   SimpleStretch : DeepSkyWorkflows > SimpleStretch

#define TITLE "Simple Stretch"
#define DEBUG_SS false
#define FEATURE "simpleStretch"

#include "deepSkyCommon.js"
#include "./simpleStretch/engine.js"
#include "./simpleStretch/ui.js"

(function (ds) {

   ds.debug.register(FEATURE, DEBUG_SS);
   ds.debug[FEATURE].debugLn(TITLE, 'debugging is on.');

   ds.features.register(FEATURE, TITLE, stretchEngine, { });

   ds.debug[FEATURE].debugLn(
      'Registered feature: ',
      JSON.stringify(ds.features[FEATURE]));

   let bootstrap = ds.engine.bootstrap([
    {
        setting: "targetBackground",
        dataType: DataType_Double,
        defaultValue: 0.2,
        precision: 2,
        label: "Target background:",
        tooltip: "A lower number results in a darker image.",
        range: { low: 0.01, high: 0.5 }
     },
     {
         setting: "shadowsClipping",
         dataType: DataType_Double,
         defaultValue: -2.4,
         precision: 1,
         label: "Shadows clipping:",
         tooltip: "Lower values clip less and higher values result in darker images and higher contrast.",
         range: { low: -15.0, high: 1.0 }
      }  
    ],
   ds.features[FEATURE].engine.doSimpleStretch,
      function () {
         ds.debug[FEATURE].debugLn('New dialog requested.');
         return ds.ui.createDialog(stretchDialog);
      },
      FEATURE,
      false);

   bootstrap();
   ds.features[FEATURE].engine.validate();
})(deepSky);
