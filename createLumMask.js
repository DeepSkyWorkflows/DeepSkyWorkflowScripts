/*

createLumMask.js: Create luminance mask
================================================================================

This script will extract luminance and stretch it for a mask.

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
 */

#feature-id    DeepSkyWorkflows > CreateLumMask

#define TITLE "Luminance Mask"

#ifndef FEATURE
#define FEATURE "createLumMask"
#endif

#ifndef DEBUG_CLM
#define DEBUG_CLM false
#endif

#include "deepSkyCommon.js"

(function (ds) {

   ds.debug.register(FEATURE, DEBUG_CLM);
   ds.debug[FEATURE].debugLn(TITLE, 'debugging is on.');

   ds.features.register(FEATURE, {

      genMask: function() {

         const executionState = ds.getExecutionState();

         if (!!!executionState.view.id) {
            ds.utilities.writeLines("No activew view. Aborting script.");
            return;
         }

         ds.utilities.writeLines('Generating mask...');
         ds.engine.extractLuminance('_LMask');
         var mask = ImageWindow.windowById(executionState.channels[0][1]).mainView;
         ds.engine.applySTF(mask);
         ds.engine.applyHistogramTransformation(mask);
      
         ds.utilities.writeLines(ds.utilities.concatenateStr('Generated mask: ', executionState.channels[0][1]));
      }
      
   });

   ds.debug[FEATURE].debugLn(
      'Registered feature: ',
      JSON.stringify(ds.features[FEATURE]));

   let bootstrap = ds.engine.bootstrap([
      {
         setting: "lumMask",
         dataType: DataType_Boolean,
         defaultValue: true,
         persist: false
      }
   ],
      ds.features[FEATURE].engine.genMask,
      function () {
         ds.debug[FEATURE].debugLn('New dialog requested, but script has no UI.');
         return {
            execute: function () {
               ds.features[FEATURE].engine.genMask();
            }
         };
      },
      FEATURE,
      true);

   bootstrap();

})(deepSky);