/*

createLumMask.js: Create luminance mask
================================================================================

This script will extract luminance and stretch it for a mask.

================================================================================
 *
 *
 * Copyright Jeremy Likness, 2021
 *
 * License: https://github.com/JeremyLikness/DeepSkyWorkflows/LICENSE
 *
 * Source: https://github.com/JeremyLikness/DeepSkyWorkflows/tree/master/piscripts
 *
 * mailTo:deepskyworkflows@gmail.com
 */

#feature-id    DeepSkyWorkflows > CreateLumMask

#define TITLE "Luminance Mask"

#include "deepSkyCommon.js"

function genMask(executionState) {

   writeLines('Generating mask...');
   extractLuminance(executionState, '_LMask');
   var mask = ImageWindow.windowById(executionState.channels[0][1]).mainView;
   applySTF(mask);
   applyHistogramTransformation(mask);

   writeLines(concatenateStr('Generated mask: ', executionState.channels[0][1]));
}

function main() {

   let executionState = {};

   writeLines(concatenateStr('v', VERSION, ' invoked'));

   if (Parameters.isViewTarget) {
      executionState.view = Parameters.targetView;
   }
   else {
      executionState.view = ImageWindow.activeWindow.currentView;
   }

   genMask(executionState);
}

main();
