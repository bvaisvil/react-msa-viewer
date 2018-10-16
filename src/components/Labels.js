/**
* Copyright 2018, Plotly, Inc.
* All rights reserved.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/
import PropTypes from 'prop-types';

import msaConnect from '../store/connect'
import CanvasComponent from './CanvasComponent';

class LabelsComponent extends CanvasComponent {

  draw() {
    let xPos = 0;
    let yPos = -this.props.position.yPos + 3;
    this.ctx.font(this.props.font);
    for (let i = 0; i < this.props.nrSequences; i++) {
      let label;
      if (this.props.labels[i]) {
        label = this.props.labels[i];
      } else {
        label = "Sequence " + i;
      }
      this.ctx.fillText(label, xPos, yPos, this.props.width, this.props.tileHeight);
      yPos += this.props.tileHeight;
    }
  }
}

LabelsComponent.defaultProps = {
  ...CanvasComponent.defaultProps,
  width: 80, // TODO: can we calculate this automatically?
};

LabelsComponent.PropTypes = {
  ...CanvasComponent.PropTypes,
  /**
   * Font of the sequence labels, e.g. `20px Arial`
   */
  font: PropTypes.string,
}

const mapStateToProps = state => {
  return {
    position: state.position,
    height: state.props.height,
    tileHeight: state.props.tileHeight,
    msecsPerFps: state.props.msecsPerFps,
    nrSequences: state.sequences.raw.length,
    labels: state.sequences.raw.map(s => s.name),
  }
}

export default msaConnect(
  mapStateToProps,
)(LabelsComponent);
