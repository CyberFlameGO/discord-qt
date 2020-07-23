import { QPushButton, CursorShape } from '@nodegui/nodegui';
import './DColorButton.scss';

export enum DColorButtonColor {
  BLURPLE = 0,
  RED = 1,
  RED_TEXT = 2,
}
export class DColorButton extends QPushButton {
  constructor(color = DColorButtonColor.BLURPLE) {
    super();

    this.setObjectName('DColorButton');
    this.setProperty('color', color);
    this.setCursor(CursorShape.PointingHandCursor);
  }
}