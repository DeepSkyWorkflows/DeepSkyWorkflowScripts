/*

starTrailMagic.js: Create star trails from timelapse images.
================================================================================
This script expects frames from a fixed point of view with stars rotating. With
these inputs, it will generate:

1. Fixed star trails - a final, static image with the trails
2. Progressive - successive images that build up to the final
3. Sequenced progressive - "moving arcs"
   
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

#feature-id   StarTrailMagic : DeepSkyWorkflows > StarTrailMagic

#define TITLE "Star Trail Magic"
#define DEBUG_STM false
#define FEATURE "starTrailMagic"

#include "deepSkyCommon.js"
#include "./starTrailMagic/engine.js"
#include "./starTrailMagic/ui.js"

(function (ds) {

   ds.debug.register(FEATURE, DEBUG_STM);
   ds.debug[FEATURE].debugLn(TITLE, 'debugging is on.');

   ds.features.register(FEATURE, TITLE, starTrailsEngine, {
        targetImages: []
    });

   ds.debug[FEATURE].debugLn(
      'Registered feature: ',
      JSON.stringify(ds.features[FEATURE]));

   let bootstrap = ds.engine.bootstrap([
     {
         setting: "progressive",
         dataType: DataType_Boolean,
         defaultValue: false,
         label: "Progressive",
         tooltip: "Choose whether or not to show the trails building up to the final."
      },
      {
        setting: "stepSize",
        dataType: DataType_Int16,
        defaultValue: 1,
        precision: 0,
        label: "Number of images to add for each frame:",
        tooltip: "How many frames to step through, i.e. 1 at a time or 3 at a time",
        range: { low: 1, high: 999 }
     },  
      {
        setting: "arcs",
        dataType: DataType_Boolean,
        defaultValue: false,
        label: "Arcs",
        tooltip: "Choose whether or not to plot arcs using a subset of frames for each image."
      },     
      {
        setting: "arcSize",
        dataType: DataType_Int16,
        defaultValue: 10,
        precision: 0,
        label: "Number of frames in an arc:",
        tooltip: "How many frames to include in each arc that is plotted.",
        range: { low: 3, high: 999 }
     }      
   ],
      ds.features[FEATURE].engine.doStarTrails,
      function () {
         ds.debug[FEATURE].debugLn('New dialog requested.');
         return ds.ui.createDialog(starTrailsDialog);
      },
      FEATURE,
      false);

   bootstrap();   
})(deepSky);
