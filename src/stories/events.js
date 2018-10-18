/**
* Copyright 2018, Plotly, Inc.
* All rights reserved.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/

import React from 'react';
import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import {
  MSAViewer,
  SequenceViewer,
} from '../lib';

const sequences = [
  {
    name: "seq.1",
    sequence: "MEEPQSDPSIEP-PLSQETFSDLWKLLPENNVLSPLPS-QA-VDDLMLSPDDLAQWLTED"
  },
  {
    name: "seq.2",
    sequence: "MEEPQSDLSIEL-PLSQETFSDLWKLLPPNNVLSTLPS-SDSIEE-LFLSENVAGWLEDP"
  },
  {
    name: "seq.3",
    sequence: "MEEPQSDLSIEL-PLSQETFSDLWKLLPPNNVLSTLPS-SDSIEE-LFLSENVAGWLEDP"
  },
];

// storybook-action-logger doesn't support auto event expansion,
// but most consoles do
const storyAction = (name) => {
  const actionCallback = action(name);
  return (e) => {
    console.log(name, e);
    actionCallback(e);
  }
}

storiesOf('Events', module)
  .add('onResidue', () => (
    <MSAViewer sequences={sequences} >
      <SequenceViewer
        onResidueMouseEnter={storyAction('onResidueMouseEnter')}
        onResidueMouseLeave={storyAction('onResidueMouseLeave')}
      />
    </MSAViewer>
  ))
;
