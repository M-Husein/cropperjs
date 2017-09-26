import * as $ from './utilities';

// Actions
const ACTION_EAST = 'e';
const ACTION_WEST = 'w';
const ACTION_SOUTH = 's';
const ACTION_NORTH = 'n';
const ACTION_SOUTH_EAST = 'se';
const ACTION_SOUTH_WEST = 'sw';
const ACTION_NORTH_EAST = 'ne';
const ACTION_NORTH_WEST = 'nw';

function getMaxZoomRatio(pointers) {
  const pointers2 = $.extend({}, pointers);
  const ratios = [];

  $.each(pointers, (pointer, pointerId) => {
    delete pointers2[pointerId];

    $.each(pointers2, (pointer2) => {
      const x1 = Math.abs(pointer.startX - pointer2.startX);
      const y1 = Math.abs(pointer.startY - pointer2.startY);
      const x2 = Math.abs(pointer.endX - pointer2.endX);
      const y2 = Math.abs(pointer.endY - pointer2.endY);
      const z1 = Math.sqrt((x1 * x1) + (y1 * y1));
      const z2 = Math.sqrt((x2 * x2) + (y2 * y2));
      const ratio = (z2 - z1) / z1;

      ratios.push(ratio);
    });
  });

  ratios.sort((a, b) => Math.abs(a) < Math.abs(b));

  return ratios[0];
}

export default {
  change(e) {
    const {
      options,
      canvasData,
      containerData,
      cropBoxData,
      pointers,
    } = this;
    let {
      action,
    } = this;
    let { aspectRatio } = options;
    let {
      left,
      top,
      width,
      height,
    } = cropBoxData;
    const right = left + width;
    const bottom = top + height;
    let minLeft = 0;
    let minTop = 0;
    let maxWidth = containerData.width;
    let maxHeight = containerData.height;
    let renderable = true;
    let offset;

    // Locking aspect ratio in "free mode" by holding shift key
    if (!aspectRatio && e.shiftKey) {
      aspectRatio = width && height ? width / height : 1;
    }

    if (this.limited) {
      ({ minLeft, minTop } = cropBoxData);
      maxWidth = minLeft + Math.min(
        containerData.width,
        canvasData.width,
        canvasData.left + canvasData.width,
      );
      maxHeight = minTop + Math.min(
        containerData.height,
        canvasData.height,
        canvasData.top + canvasData.height,
      );
    }

    const pointer = pointers[Object.keys(pointers)[0]];
    const range = {
      x: pointer.endX - pointer.startX,
      y: pointer.endY - pointer.startY,
    };
    const check = (side) => {
      switch (side) {
        case ACTION_EAST:
          if (right + range.x > maxWidth) {
            range.x = maxWidth - right;
          }

          break;

        case ACTION_WEST:
          if (left + range.x < minLeft) {
            range.x = minLeft - left;
          }

          break;

        case ACTION_NORTH:
          if (top + range.y < minTop) {
            range.y = minTop - top;
          }

          break;

        case ACTION_SOUTH:
          if (bottom + range.y > maxHeight) {
            range.y = maxHeight - bottom;
          }

          break;

        default:
      }
    };

    switch (action) {
      // Move crop box
      case 'all':
        left += range.x;
        top += range.y;
        break;

      // Resize crop box
      case ACTION_EAST:
        if (range.x >= 0 && (right >= maxWidth || (aspectRatio &&
          (top <= minTop || bottom >= maxHeight)))) {
          renderable = false;
          break;
        }

        check(ACTION_EAST);
        width += range.x;

        if (aspectRatio) {
          height = width / aspectRatio;
          top -= (range.x / aspectRatio) / 2;
        }

        if (width < 0) {
          action = ACTION_WEST;
          width = 0;
        }

        break;

      case ACTION_NORTH:
        if (range.y <= 0 && (top <= minTop || (aspectRatio &&
          (left <= minLeft || right >= maxWidth)))) {
          renderable = false;
          break;
        }

        check(ACTION_NORTH);
        height -= range.y;
        top += range.y;

        if (aspectRatio) {
          width = height * aspectRatio;
          left += (range.y * aspectRatio) / 2;
        }

        if (height < 0) {
          action = ACTION_SOUTH;
          height = 0;
        }

        break;

      case ACTION_WEST:
        if (range.x <= 0 && (left <= minLeft || (aspectRatio &&
          (top <= minTop || bottom >= maxHeight)))) {
          renderable = false;
          break;
        }

        check(ACTION_WEST);
        width -= range.x;
        left += range.x;

        if (aspectRatio) {
          height = width / aspectRatio;
          top += (range.x / aspectRatio) / 2;
        }

        if (width < 0) {
          action = ACTION_EAST;
          width = 0;
        }

        break;

      case ACTION_SOUTH:
        if (range.y >= 0 && (bottom >= maxHeight || (aspectRatio &&
          (left <= minLeft || right >= maxWidth)))) {
          renderable = false;
          break;
        }

        check(ACTION_SOUTH);
        height += range.y;

        if (aspectRatio) {
          width = height * aspectRatio;
          left -= (range.y * aspectRatio) / 2;
        }

        if (height < 0) {
          action = ACTION_NORTH;
          height = 0;
        }

        break;

      case ACTION_NORTH_EAST:
        if (aspectRatio) {
          if (range.y <= 0 && (top <= minTop || right >= maxWidth)) {
            renderable = false;
            break;
          }

          check(ACTION_NORTH);
          height -= range.y;
          top += range.y;
          width = height * aspectRatio;
        } else {
          check(ACTION_NORTH);
          check(ACTION_EAST);

          if (range.x >= 0) {
            if (right < maxWidth) {
              width += range.x;
            } else if (range.y <= 0 && top <= minTop) {
              renderable = false;
            }
          } else {
            width += range.x;
          }

          if (range.y <= 0) {
            if (top > minTop) {
              height -= range.y;
              top += range.y;
            }
          } else {
            height -= range.y;
            top += range.y;
          }
        }

        if (width < 0 && height < 0) {
          action = ACTION_SOUTH_WEST;
          height = 0;
          width = 0;
        } else if (width < 0) {
          action = ACTION_NORTH_WEST;
          width = 0;
        } else if (height < 0) {
          action = ACTION_SOUTH_EAST;
          height = 0;
        }

        break;

      case ACTION_NORTH_WEST:
        if (aspectRatio) {
          if (range.y <= 0 && (top <= minTop || left <= minLeft)) {
            renderable = false;
            break;
          }

          check(ACTION_NORTH);
          height -= range.y;
          top += range.y;
          width = height * aspectRatio;
          left += range.y * aspectRatio;
        } else {
          check(ACTION_NORTH);
          check(ACTION_WEST);

          if (range.x <= 0) {
            if (left > minLeft) {
              width -= range.x;
              left += range.x;
            } else if (range.y <= 0 && top <= minTop) {
              renderable = false;
            }
          } else {
            width -= range.x;
            left += range.x;
          }

          if (range.y <= 0) {
            if (top > minTop) {
              height -= range.y;
              top += range.y;
            }
          } else {
            height -= range.y;
            top += range.y;
          }
        }

        if (width < 0 && height < 0) {
          action = ACTION_SOUTH_EAST;
          height = 0;
          width = 0;
        } else if (width < 0) {
          action = ACTION_NORTH_EAST;
          width = 0;
        } else if (height < 0) {
          action = ACTION_SOUTH_WEST;
          height = 0;
        }

        break;

      case ACTION_SOUTH_WEST:
        if (aspectRatio) {
          if (range.x <= 0 && (left <= minLeft || bottom >= maxHeight)) {
            renderable = false;
            break;
          }

          check(ACTION_WEST);
          width -= range.x;
          left += range.x;
          height = width / aspectRatio;
        } else {
          check(ACTION_SOUTH);
          check(ACTION_WEST);

          if (range.x <= 0) {
            if (left > minLeft) {
              width -= range.x;
              left += range.x;
            } else if (range.y >= 0 && bottom >= maxHeight) {
              renderable = false;
            }
          } else {
            width -= range.x;
            left += range.x;
          }

          if (range.y >= 0) {
            if (bottom < maxHeight) {
              height += range.y;
            }
          } else {
            height += range.y;
          }
        }

        if (width < 0 && height < 0) {
          action = ACTION_NORTH_EAST;
          height = 0;
          width = 0;
        } else if (width < 0) {
          action = ACTION_SOUTH_EAST;
          width = 0;
        } else if (height < 0) {
          action = ACTION_NORTH_WEST;
          height = 0;
        }

        break;

      case ACTION_SOUTH_EAST:
        if (aspectRatio) {
          if (range.x >= 0 && (right >= maxWidth || bottom >= maxHeight)) {
            renderable = false;
            break;
          }

          check(ACTION_EAST);
          width += range.x;
          height = width / aspectRatio;
        } else {
          check(ACTION_SOUTH);
          check(ACTION_EAST);

          if (range.x >= 0) {
            if (right < maxWidth) {
              width += range.x;
            } else if (range.y >= 0 && bottom >= maxHeight) {
              renderable = false;
            }
          } else {
            width += range.x;
          }

          if (range.y >= 0) {
            if (bottom < maxHeight) {
              height += range.y;
            }
          } else {
            height += range.y;
          }
        }

        if (width < 0 && height < 0) {
          action = ACTION_NORTH_WEST;
          height = 0;
          width = 0;
        } else if (width < 0) {
          action = ACTION_SOUTH_WEST;
          width = 0;
        } else if (height < 0) {
          action = ACTION_NORTH_EAST;
          height = 0;
        }

        break;

      // Move canvas
      case 'move':
        this.move(range.x, range.y);
        renderable = false;
        break;

      // Zoom canvas
      case 'zoom':
        this.zoom(getMaxZoomRatio(pointers), e);
        renderable = false;
        break;

      // Create crop box
      case 'crop':
        if (!range.x || !range.y) {
          renderable = false;
          break;
        }

        offset = $.getOffset(this.cropper);
        left = pointer.startX - offset.left;
        top = pointer.startY - offset.top;
        width = cropBoxData.minWidth;
        height = cropBoxData.minHeight;

        if (range.x > 0) {
          action = range.y > 0 ? ACTION_SOUTH_EAST : ACTION_NORTH_EAST;
        } else if (range.x < 0) {
          left -= width;
          action = range.y > 0 ? ACTION_SOUTH_WEST : ACTION_NORTH_WEST;
        }

        if (range.y < 0) {
          top -= height;
        }

        // Show the crop box if is hidden
        if (!this.cropped) {
          $.removeClass(this.cropBox, 'cropper-hidden');
          this.cropped = true;

          if (this.limited) {
            this.limitCropBox(true, true);
          }
        }

        break;

      default:
    }

    if (renderable) {
      cropBoxData.width = width;
      cropBoxData.height = height;
      cropBoxData.left = left;
      cropBoxData.top = top;
      this.action = action;
      this.renderCropBox();
    }

    // Override
    $.each(pointers, (p) => {
      p.startX = p.endX;
      p.startY = p.endY;
    });
  },
};
