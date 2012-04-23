define(["Ti/_/Layouts/Base", "Ti/_/declare", "Ti/UI", "Ti/_/lang", "Ti/_/style"], function(Base, declare, UI, lang, style) {
	
	var isDef = lang.isDef,
		setStyle = style.set,
		pixelUnits = "px";

	return declare("Ti._.Layouts.Composite", Base, {
		
		_doLayout: function(element, width, height, isWidthSize, isHeightSize) {
			var computedSize = this._computedSize = {width: 0, height: 0},
				children = element.children,
				child,
				i,
				layoutCoefficients, 
				widthLayoutCoefficients, heightLayoutCoefficients, sandboxWidthLayoutCoefficients, sandboxHeightLayoutCoefficients, topLayoutCoefficients, leftLayoutCoefficients, 
				childSize,
				measuredWidth, measuredHeight, measuredSandboxHeight, measuredSandboxWidth, measuredLeft, measuredTop,
				deferredLeftCalculations = [],
				deferredTopCalculations = [];
			
			// Calculate size and position for the children
			for(i = 0; i < children.length; i++) {
				
				child = element.children[i];
				if (this.verifyChild(child,element)) {
					
					// Border validation
					if (!child._borderSet) {
						this.updateBorder(child);
					}
					
					if (child._markedForLayout) {
						((child._preLayout && child._preLayout(width, height, isWidthSize, isHeightSize)) || child._needsMeasuring) && this._measureNode(child, child._layoutCoefficients);
						
						layoutCoefficients = child._layoutCoefficients;
						widthLayoutCoefficients = layoutCoefficients.width;
						heightLayoutCoefficients = layoutCoefficients.height;
						sandboxWidthLayoutCoefficients = layoutCoefficients.sandboxWidth;
						sandboxHeightLayoutCoefficients = layoutCoefficients.sandboxHeight;
						leftLayoutCoefficients = layoutCoefficients.left;
						topLayoutCoefficients = layoutCoefficients.top;
						
						measuredWidth = widthLayoutCoefficients.x1 * width + widthLayoutCoefficients.x2;
						measuredHeight = heightLayoutCoefficients.x1 * height + heightLayoutCoefficients.x2;
						
						if (child._getContentSize) {
							childSize = child._getContentSize();
						} else {
							childSize = child._layout._doLayout(
								child, 
								isNaN(measuredWidth) ? width : measuredWidth, 
								isNaN(measuredHeight) ? height : measuredHeight, 
								isNaN(measuredWidth), 
								isNaN(measuredHeight));
						}
						isNaN(measuredWidth) && (measuredWidth = childSize.width + child._borderLeftWidth + child._borderRightWidth);
						isNaN(measuredHeight) && (measuredHeight = childSize.height + child._borderTopWidth + child._borderBottomWidth);
						
						if (isWidthSize && leftLayoutCoefficients.x1 !== 0) {
							deferredLeftCalculations.push(child);
						} else {
							measuredLeft = leftLayoutCoefficients.x1 * width + leftLayoutCoefficients.x2 * measuredWidth + leftLayoutCoefficients.x3;
						}
						if (isHeightSize && topLayoutCoefficients.x1 !== 0) {
							deferredTopCalculations.push(child);
						} else {
							measuredTop = topLayoutCoefficients.x1 * height + topLayoutCoefficients.x2 * measuredHeight + topLayoutCoefficients.x3;
						}
						
						child._measuredSandboxWidth = measuredSandboxWidth = sandboxWidthLayoutCoefficients.x1 * height + sandboxWidthLayoutCoefficients.x2 + measuredWidth + (isNaN(measuredLeft) ? 0 : measuredLeft);
						child._measuredSandboxHeight = measuredSandboxHeight = sandboxHeightLayoutCoefficients.x1 * height + sandboxHeightLayoutCoefficients.x2 + measuredHeight + (isNaN(measuredTop) ? 0 : measuredTop);
					
						// Update the size of the component
						measuredSandboxWidth > computedSize.width && (computedSize.width = measuredSandboxWidth);
						measuredSandboxHeight > computedSize.height && (computedSize.height = measuredSandboxHeight);
						
						child._measuredWidth = measuredWidth;
						child._measuredHeight = measuredHeight;
						child._measuredLeft = measuredLeft;
						child._measuredTop = measuredTop;
					}
				}
			}
			
			// Second pass, if necessary, to determine the left/top values
			for(i in deferredLeftCalculations) {
				child = deferredLeftCalculations[i];
				leftLayoutCoefficients = child._layoutCoefficients.left;
				sandboxWidthLayoutCoefficients = child._layoutCoefficients.sandboxWidth;
				child._measuredLeft = measuredLeft = leftLayoutCoefficients.x1 * computedSize.width + leftLayoutCoefficients.x2 * measuredWidth + leftLayoutCoefficients.x3;
				child._measuredSandboxWidth = measuredSandboxWidth = sandboxWidthLayoutCoefficients.x1 * height + sandboxWidthLayoutCoefficients.x2 + child._measuredWidth + measuredLeft;
				
				// Update the size of the component
				measuredSandboxWidth = child._measuredSandboxWidth;
				measuredSandboxWidth > computedSize.width && (computedSize.width = measuredSandboxWidth);
			}
			for(i in deferredTopCalculations) {
				child = deferredTopCalculations[i];
				topLayoutCoefficients = child._layoutCoefficients.top;
				sandboxHeightLayoutCoefficients = child._layoutCoefficients.sandboxHeight;
				child._measuredTop = measuredTop = topLayoutCoefficients.x1 * computedSize.height + topLayoutCoefficients.x2 * measuredHeight + topLayoutCoefficients.x3;
				child._measuredSandboxHeight = measuredSandboxHeight = sandboxHeightLayoutCoefficients.x1 * height + sandboxHeightLayoutCoefficients.x2 + child._measuredHeight + measuredTop;
				
				// Update the size of the component
				measuredSandboxHeight = child._measuredSandboxHeight;
				measuredSandboxHeight > computedSize.height && (computedSize.height = measuredSandboxHeight);
			}
			
			// Position the children
			for(i = 0; i < children.length; i++) {
				child = children[i];
				if (child._markedForLayout) {
					UI._elementLayoutCount++;
					setStyle(child.domNode, {
						zIndex: child.zIndex | 0,
						left: Math.round(child._measuredLeft) + pixelUnits,
						top: Math.round(child._measuredTop) + pixelUnits,
						width: Math.round(child._measuredWidth - child._borderLeftWidth - child._borderRightWidth) + pixelUnits,
						height: Math.round(child._measuredHeight - child._borderTopWidth - child._borderBottomWidth) + pixelUnits
					});
					child._markedForLayout = false;
					child.fireEvent("postlayout");
				}
			}
			
			return this._computedSize = computedSize;
		},
		
		_getWidth: function(node) {
			
			// Ge the width or default width, depending on which one is needed
			var width = node.width;
			!isDef(width) && (isDef(node.left) + isDef(node.center && node.center.x) + isDef(node.right) < 2) && (width = node._defaultWidth);
			
			// Check if the width is INHERIT, and if so fetch the inherited width
			if (width === UI.INHERIT) {
				if (node._parent._parent) {
					return node._parent._parent._layout._getWidth(node._parent) === UI.SIZE ? UI.SIZE : UI.FILL;
				} else { // This is the root level content container, which we know has a width of FILL
					return UI.FILL;
				}
			} else {
				return width;
			}
		},
		
		_getHeight: function(node) {
			// Ge the height or default height, depending on which one is needed
			var height = node.height;
			!isDef(height) && (isDef(node.top) + isDef(node.center && node.center.y) + isDef(node.bottom) < 2) && (height = node._defaultHeight);
			
			// Check if the width is INHERIT, and if so fetch the inherited width
			if (height === UI.INHERIT) {
				if (node._parent._parent) {
					return node._parent._parent._layout._getHeight(node._parent) === UI.SIZE ? UI.SIZE : UI.FILL;
				} else { // This is the root level content container, which we know has a width of FILL
					return UI.FILL;
				}
			} else {
				return height;
			}
		},
		
		_isDependentOnParent: function(node){
			var layoutCoefficients = node._layoutCoefficients;
			return (!isNaN(layoutCoefficients.width.x1) && layoutCoefficients.width.x1 !== 0) || // width
				(!isNaN(layoutCoefficients.height.x1) && layoutCoefficients.height.x1 !== 0) || // height
				layoutCoefficients.left.x1 !== 0 // left
				layoutCoefficients.top.x1 !== 0; // top
		},
		
		_doAnimationLayout: function(node, animationCoefficients) {
			
			var parentWidth = node._parent._measuredWidth,
				parentHeight = node._parent._measuredHeight,
				nodeWidth = node._measuredWidth,
				nodeHeight = node._measuredHeight,
				width = animationCoefficients.width.x1 * parentWidth + animationCoefficients.width.x2,
				height = animationCoefficients.height.x1 * parentHeight + animationCoefficients.height.x2;
			
			return {
				width: width,
				height: height,
				left: animationCoefficients.left.x1 * parentWidth + animationCoefficients.left.x2 * width + animationCoefficients.left.x3,
				top: animationCoefficients.top.x1 * parentHeight + animationCoefficients.top.x2 * height + animationCoefficients.top.x3
			}
		},
		
		_measureNode: function(node, layoutCoefficients) {
			
			node._needsMeasuring = false;
			
			// Pre-processing
			var getValueType = this.getValueType,
				computeValue = this.computeValue,
			
				width = this._getWidth(node),
				widthType = getValueType(width),
				widthValue = computeValue(width, widthType),
				
				height = this._getHeight(node),
				heightType = getValueType(height),
				heightValue = computeValue(height, heightType),
				
				left = node.left,
				leftType = getValueType(left),
				leftValue = computeValue(left, leftType),
				
				centerX = node.center && node.center.x,
				centerXType = getValueType(centerX),
				centerXValue = computeValue(centerX, centerXType),
				
				right = node.right,
				rightType = getValueType(right),
				rightValue = computeValue(right, rightType),
				
				top = node.top,
				topType = getValueType(top),
				topValue = computeValue(top, topType),
				
				centerY = node.center && node.center.y,
				centerYType = getValueType(centerY),
				centerYValue = computeValue(centerY, centerYType),
				
				bottom = node.bottom,
				bottomType = getValueType(bottom),
				bottomValue = computeValue(bottom, bottomType),
				
				x1, x2, x3,
				
				sandboxWidthLayoutCoefficients = layoutCoefficients.sandboxWidth,
				sandboxHeightLayoutCoefficients = layoutCoefficients.sandboxHeight;
			
			// Width/height rule evaluation
			var paramsSet = {
					width: [widthType, widthValue, leftType, leftValue, centerXType, centerXValue, rightType, rightValue],
					height: [heightType, heightValue, topType, topValue, centerYType, centerYValue, bottomType, bottomValue]
				},
				params, sizeType, sizeValue, startType, startValue, centerType, centerValue, endType, endValue;
			for (var i in paramsSet) {
				
				params = paramsSet[i];
				sizeType = params[0];
				sizeValue = params[1];
				startType = params[2];
				startValue = params[3];
				centerType = params[4];
				centerValue = params[5];
				endType = params[6];
				endValue = params[7];
				
				x1 = x2 = 0;
				if (sizeType === UI.SIZE) {
					x1 = x2 = NaN;
				} else if (sizeType === UI.FILL) {
					x1 = 1;
					if (startType === "%") {
						x1 -= startValue;
					} else if (startType === "#") {
						x2 = -startValue;
					} else if (endType === "%") {
						x1 -= endValue;
					} else if (endType === "#") {
						x2 = -endValue;
					}
				} else if (sizeType === "%") {
					x1 = sizeValue;
				} else if (sizeType === "#") {
					x2 = sizeValue;
				} else if (startType === "%") {
					if (centerType === "%") {
						x1 = 2 * (centerValue - startValue);
					} else if (centerType === "#") {
						x1 = -2 * startValue;
						x2 = 2 * centerValue;
					} else if (endType === "%") {
						x1 = 1 - startValue - endValue;
					} else if (endType === "#") {
						x1 = 1 - startValue;
						x2 = -endValue;
					}
				} else if (startType === "#") {
					if (centerType === "%") {
						x1 = 2 * centerValue;
						x2 = -2 * startValue;
					} else if (centerType === "#") {
						x2 = 2 * (centerValue - startValue);
					} else if (endType === "%") {
						x1 = 1 - endValue;
						x2 = -startValue;
					} else if (endType === "#") {
						x1 = 1;
						x2 = -endValue - startValue;
					}
				} else if (centerType === "%") {
					if (endType === "%") {
						x1 = 2 * (endValue - centerValue);
					} else if (endType === "#") {
						x1 = -2 * centerValue;
						x2 = 2 * endValue;
					}
				} else if (centerType === "#") {
					if (endType === "%") {
						x1 = 2 * endValue;
						x2 = -2 * centerValue;
					} else if (endType === "#") {
						x2 = 2 * (endValue - centerValue);
					}
				}
				layoutCoefficients[i].x1 = x1;
				layoutCoefficients[i].x2 = x2;
			}
			
			// Left/top rule evaluation
			paramsSet = {
				left: [leftType, leftValue, centerXType, centerXValue, rightType, rightValue],
				top: [topType, topValue, centerYType, centerYValue, bottomType, bottomValue]
			};
			for (var i in paramsSet) {
				
				params = paramsSet[i];
				startType = params[0];
				startValue = params[1];
				centerType = params[2];
				centerValue = params[3];
				endType = params[4];
				endValue = params[5];
					
				x1 = x2 = x3 = 0;
				if (startType === "%") {
					x1 = startValue;
				} else if(startType === "#") {
					x3 = startValue;
				} else if (centerType === "%") {
					x1 = centerValue;
					x2 = -0.5;
				} else if (centerType === "#") {
					x2 = -0.5;
					x3 = centerValue;
				} else if (endType === "%") {
					x1 = 1 - endValue;
					x2 = -1;
				} else if (endType === "#") {
					x1 = 1;
					x2 = -1;
					x3 = -endValue;
				} else { 
					switch(i === "left" ? this._defaultHorizontalAlignment : this._defaultVerticalAlignment) {
						case "center": 
							x1 = 0.5;
							x2 = -0.5;
							break;
						case "end":
							x1 = 1;
							x2 = -1;
					}
				}
				layoutCoefficients[i].x1 = x1;
				layoutCoefficients[i].x2 = x2;
				layoutCoefficients[i].x3 = x3;
			}
			
			// Sandbox width/height rule evaluation
			sandboxWidthLayoutCoefficients.x1 = rightType === "%" ? rightValue : 0;
			sandboxWidthLayoutCoefficients.x2 = rightType === "#" ? rightValue : 0;
			sandboxHeightLayoutCoefficients.x1 = bottomType === "%" ? bottomValue : 0;
			sandboxHeightLayoutCoefficients.x2 = bottomType === "#" ? bottomValue : 0;
		},
		
		_defaultHorizontalAlignment: "center",
		
		_defaultVerticalAlignment: "center"
		
	});

});
