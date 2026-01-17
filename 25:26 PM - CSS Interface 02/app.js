// ===============================
// ARCHIVE PNG EXPORT & LOCALSTORAGE
// ===============================
function saveCurrentDesignToArchive() {
  try {
    const svgCanvas = document.getElementById('svg-canvas');
    const svg = svgCanvas?.querySelector('svg');
    if (!svg) {
      alert('No SVG to archive. Please import or create a design first.');
      return;
    }
    // Clone SVG for export
    const svgClone = svg.cloneNode(true);
    // Remove transforms for clean export (optional, matches exportSVGFile)
    svgClone.querySelectorAll('[transform]').forEach(el => {
      const transform = el.getAttribute('transform');
      if (transform && transform.includes('translate')) {
        // Optionally clean up
      }
    });
    // Serialize SVG
    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(svgClone);
    // Add XML declaration if missing
    if (!svgString.startsWith('<?xml')) {
      svgString = '<?xml version="1.0" encoding="UTF-8"?>\n' + svgString;
    }
    // Create image for canvas rendering
    const img = new window.Image();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(svgBlob);
    img.onload = function() {
      // Create canvas with SVG viewBox size
      let width = 600, height = 800;
      const vb = svgClone.getAttribute('viewBox');
      if (vb) {
        const parts = vb.split(/\s+/);
        if (parts.length === 4) {
          width = Math.round(parseFloat(parts[2]));
          height = Math.round(parseFloat(parts[3]));
        }
      } else {
        width = svgClone.width?.baseVal?.value || 600;
        height = svgClone.height?.baseVal?.value || 800;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      // Get PNG data URL
      const dataUrl = canvas.toDataURL('image/png');
      // Save to localStorage
      try {
        const key = 'typeflow_archive_items';
        let items = [];
        try {
          items = JSON.parse(localStorage.getItem(key)) || [];
        } catch (e) { items = []; }
        // Enforce max 50 items
        while (items.length >= 50) items.shift();
        items.push({
          id: 'archive-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
          dataUrl,
          createdAt: new Date().toISOString()
        });
        localStorage.setItem(key, JSON.stringify(items));
        alert('Design saved to archive!');
      } catch (err) {
        alert('Could not save to archive: ' + err.message);
      }
    };
    img.onerror = function() {
      URL.revokeObjectURL(url);
      alert('Failed to render SVG to PNG.');
    };
    img.src = url;
  } catch (err) {
    alert('Could not save to archive: ' + err.message);
  }
}
// Attach Save to Archive button listener
document.addEventListener('DOMContentLoaded', function() {
  var saveArchiveBtn = document.getElementById('save-archive-btn');
  if (saveArchiveBtn) {
    saveArchiveBtn.addEventListener('click', function(e) {
      e.preventDefault();
      saveCurrentDesignToArchive();
    });
  }
});
// ===============================
// MULTI-SHAPE MOTION ANIMATION SYSTEM
// ===============================
// Each shape gets its own motion state
function getDefaultMotionState() {
  return {
    playing: false,
    mode: 'wave',
    speed: 50,
    amount: 50,
    rafId: null,
  };
}

// Attach a motion state to each shape
function ensureShapeMotionState(shape) {
  if (!shape.motionState) {
    shape.motionState = getDefaultMotionState();
  }
}

// Read UI and apply to selected shape's motion state
function applyMotionUIToShape(shape) {
  if (!shape) return;
  ensureShapeMotionState(shape);
  // Read UI state for Play, Speed, Amount, Mode
  const motionToggle = document.querySelector('.motion-toggle');
  const options = motionToggle ? motionToggle.querySelectorAll('.motion-toggle-option') : null;
  let playing = false;
  if (options && options.length === 2) {
    playing = options[0].classList.contains('active'); // ON is first
  }
  const speedSlider = document.getElementById('speed-slider');
  const amountSlider = document.getElementById('amount-slider');
  let speed = speedSlider ? parseFloat(speedSlider.value) : 50;
  let amount = amountSlider ? parseFloat(amountSlider.value) : 50;
  let mode = 'wave';
  const modeOpt = document.querySelector('.mode-option.active');
  if (modeOpt) mode = modeOpt.getAttribute('data-mode') || 'wave';
  shape.motionState.playing = playing;
  shape.motionState.speed = speed;
  shape.motionState.amount = amount;
  shape.motionState.mode = mode;
}

// Animate all shapes with motion enabled
function animateAllTextMotion() {
  const now = performance.now();
  const t = now / 1000;
  let anyPlaying = false;
  for (const shape of areaTextState.shapes) {
    ensureShapeMotionState(shape);
    const { playing, speed, amount, mode } = shape.motionState;
    if (!playing) {
      // Reset transforms if not playing
      if (shape.textGroup) {
        shape.textGroup.setAttribute('transform', '');
        shape.textGroup.querySelectorAll('text').forEach(line => {
          line.setAttribute('transform', '');
          line.querySelectorAll('tspan').forEach(tspan => tspan.setAttribute('dy', '0'));
        });
      }
      if (shape.outlineGroup) {
        shape.outlineGroup.setAttribute('transform', '');
        shape.outlineGroup.querySelectorAll('text').forEach(line => {
          line.setAttribute('transform', '');
          line.querySelectorAll('tspan').forEach(tspan => tspan.setAttribute('dy', '0'));
        });
      }
      continue;
    }
    anyPlaying = true;
    // Animate only the visible text group (fill or outline)
    let group = null;
    if (shape.renderMode === 'fill' && shape.textGroup) group = shape.textGroup;
    if (shape.renderMode === 'outline' && shape.outlineGroup) group = shape.outlineGroup;
    if (!group) continue;
    // Animation parameters removed: no motion for wave, pulse, or stretch
    // All transforms are reset above, nothing animated
  }
  // Keep animating if any shape is playing
  if (anyPlaying) {
    window._multiMotionRaf = requestAnimationFrame(animateAllTextMotion);
  } else {
    window._multiMotionRaf = null;
  }
}

// UI listeners: apply UI to selected shape and animate all
function setupMultiMotionUIListeners() {
  // Play/Off, Speed, Amount, Mode
  const controls = [
    ...document.querySelectorAll('.motion-toggle-option'),
    document.getElementById('speed-slider'),
    document.getElementById('amount-slider'),
    ...document.querySelectorAll('.mode-option')
  ];
  controls.forEach(ctrl => {
    if (ctrl) ctrl.addEventListener('input', applyAndAnimateFromUI);
    if (ctrl) ctrl.addEventListener('click', applyAndAnimateFromUI);
  });
  // On shape selection, do NOT stop other shapes, just update UI for selected
}

function applyAndAnimateFromUI() {
  const shape = findShapeById(areaTextState.selectedShapeId);
  if (shape) {
    applyMotionUIToShape(shape);
  }
  if (!window._multiMotionRaf) {
    animateAllTextMotion();
  }
}

// Patch setSelection to NOT stop other shapes, just update UI for selected
const origSetSelection = window.setSelection;
window.setSelection = function(shapeEl, wrapperEl) {
  if (origSetSelection) origSetSelection.apply(this, arguments);
  // Do not stop other shapes' motion, just update UI for selected
  // Optionally, sync UI to selected shape's motion state
  const shape = findShapeById(areaTextState.selectedShapeId);
  if (shape && shape.motionState) {
    // Sync UI controls to this shape's motion state
    const motionToggle = document.querySelector('.motion-toggle');
    const options = motionToggle ? motionToggle.querySelectorAll('.motion-toggle-option') : null;
    if (options && options.length === 2) {
      options[0].classList.toggle('active', !!shape.motionState.playing);
      options[1].classList.toggle('active', !shape.motionState.playing);
    }
    const speedSlider = document.getElementById('speed-slider');
    if (speedSlider) speedSlider.value = shape.motionState.speed;
    const amountSlider = document.getElementById('amount-slider');
    if (amountSlider) amountSlider.value = shape.motionState.amount;
    const modeOpts = document.querySelectorAll('.mode-option');
    modeOpts.forEach(opt => {
      opt.classList.toggle('active', opt.getAttribute('data-mode') === shape.motionState.mode);
    });
  }
};
if (!window.setSelection) {
  const localSetSelection = typeof setSelection === 'function' ? setSelection : null;
  window.setSelection = function(shapeEl, wrapperEl) {
    if (localSetSelection) localSetSelection.apply(this, arguments);
    // Same as above
    const shape = findShapeById(areaTextState.selectedShapeId);
    if (shape && shape.motionState) {
      const motionToggle = document.querySelector('.motion-toggle');
      const options = motionToggle ? motionToggle.querySelectorAll('.motion-toggle-option') : null;
      if (options && options.length === 2) {
        options[0].classList.toggle('active', !!shape.motionState.playing);
        options[1].classList.toggle('active', !shape.motionState.playing);
      }
      const speedSlider = document.getElementById('speed-slider');
      if (speedSlider) speedSlider.value = shape.motionState.speed;
      const amountSlider = document.getElementById('amount-slider');
      if (amountSlider) amountSlider.value = shape.motionState.amount;
      const modeOpts = document.querySelectorAll('.mode-option');
      modeOpts.forEach(opt => {
        opt.classList.toggle('active', opt.getAttribute('data-mode') === shape.motionState.mode);
      });
    }
  };
}

// Setup listeners on DOMContentLoaded
document.addEventListener('DOMContentLoaded', setupMultiMotionUIListeners);
document.addEventListener('DOMContentLoaded', () => {
  // On first load, apply UI to selected shape and start animating if needed
  const shape = findShapeById(areaTextState.selectedShapeId);
  if (shape) applyMotionUIToShape(shape);
  animateAllTextMotion();
});
/* ============================================
   RESIZABLE COLUMNS INTERACTION LOGIC
   Handles dragging between columns to resize
   ============================================ */

// State for tracking resize operations
let resizeState = {
  isResizing: false,
  startX: 0,
  handle: null,
  columns: null
};

// Minimum width (in pixels) a column can shrink to; keep tiny so edges can be reached
const MIN_COLUMN_WIDTH = 2;

// Keep CSS custom properties in sync with current column widths
function updateColumnCSSVars(container) {
  const grid = container || document.querySelector('.columns-container');
  if (!grid) return;

  const columns = grid.querySelectorAll('.column');
  if (columns.length < 3) return;

  const totalWidth = grid.offsetWidth || 1;
  const widths = Array.from(columns).map(col => (col.offsetWidth / totalWidth) * 100);
  const root = document.documentElement;

  root.style.setProperty('--left', `${widths[0]}%`);
  root.style.setProperty('--center', `${widths[1]}%`);
  root.style.setProperty('--right', `${widths[2]}%`);
}

// ============================================
// INITIALIZATION
// ============================================

function initializeResizeHandles() {
  const handles = document.querySelectorAll('.drag-handle');
  
  handles.forEach(handle => {
    handle.addEventListener('mousedown', startResize);
  });

  // Set initial CSS vars to match rendered widths
  updateColumnCSSVars(document.querySelector('.columns-container'));
}

// ============================================
// RESIZE LOGIC
// ============================================

function startResize(event) {
  // Prevent text selection during drag
  event.preventDefault();
  
  resizeState.isResizing = true;
  resizeState.startX = event.clientX;
  resizeState.handle = event.target;
  
  // Find the two columns adjacent to this handle
  const container = document.querySelector('.columns-container');
  const allColumns = Array.from(container.querySelectorAll('.column'));
  const handleIndex = Array.from(container.children).indexOf(event.target);
  
  resizeState.columns = {
    left: container.children[handleIndex - 1],
    right: container.children[handleIndex + 1]
  };
  
  // Add active state to handle
  resizeState.handle.classList.add('active');
  
  // Attach move and end listeners to document
  document.addEventListener('mousemove', doResize);
  document.addEventListener('mouseup', endResize);
}

function doResize(event) {
  if (!resizeState.isResizing) return;
  
  const deltaX = event.clientX - resizeState.startX;
  const container = document.querySelector('.columns-container');
  const containerWidth = container.offsetWidth;
  
  // Get current flex values (width as percentage)
  const leftCol = resizeState.columns.left;
  const rightCol = resizeState.columns.right;
  
  const leftWidth = leftCol.offsetWidth;
  const rightWidth = rightCol.offsetWidth;

  // Combined width of the two columns we are adjusting
  const totalPairWidth = leftWidth + rightWidth;
  
  // Calculate new widths
  let newLeftWidth = leftWidth + deltaX;
  // Clamp left width so either column can shrink to a near-line
  newLeftWidth = Math.max(MIN_COLUMN_WIDTH, Math.min(totalPairWidth - MIN_COLUMN_WIDTH, newLeftWidth));
  const newRightWidth = totalPairWidth - newLeftWidth;
  
  // Update flex basis with calculated widths
  const leftPercent = (newLeftWidth / containerWidth) * 100;
  const rightPercent = (newRightWidth / containerWidth) * 100;
  
  leftCol.style.flex = `0 0 ${leftPercent}%`;
  rightCol.style.flex = `0 0 ${rightPercent}%`;
  
  // Update start position for next mousemove event
  resizeState.startX = event.clientX;

  updateColumnCSSVars(container);
  
  // Update toggle slider position when column resizes
  updateToggleSlider();
}

function endResize() {
  if (!resizeState.isResizing) return;
  
  resizeState.isResizing = false;
  
  // Remove active state from handle
  if (resizeState.handle) {
    resizeState.handle.classList.remove('active');
  }
  
  // Clean up state
  resizeState.handle = null;
  resizeState.columns = null;
  
  // Remove event listeners from document
  document.removeEventListener('mousemove', doResize);
  document.removeEventListener('mouseup', endResize);
}

// ============================================
// START ON LOAD
// ============================================

document.addEventListener('DOMContentLoaded', initializeResizeHandles);

/* ============================================
   SVG IMPORT FUNCTIONALITY
   ============================================ */

const DEFAULT_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg id="Ebene_1" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 595.28 841.89">
  <defs>
    <style>
      .st0 {
        fill: #f1f1f1;
      }
    </style>
  </defs>
  <path class="st0" d="M366.02,217.42c-9.64-38.36-24.54-75.97-42.8-96.86-53,210.31-6.11,152,42.8,96.86Z"/>
  <path class="st0" d="M216.73,359.29l26.16-207.83c-9.28,17.88-18.71,41.35-28.19,71.42-83.95,266.39,74.33-216.78,3.84-209.14C148.05,21.36,23.09,45.79,23.09,45.79l61.52-4.58s99.97-4.58,69.85,135.87c-19.13,89.2-68.24,164.23-101.53,206.91,25.94-27.8,62.37-62.66,91.28-74.86,49.5-20.9,61.63,132.6,79.52,110.16-14.41-12.51-7-60-7-60Z"/>
  <path class="st0" d="M316.46,113.75c-19.81-17.28-43.01-14.36-67.47,26.7-.27,121.97,37.74,48.64,67.47-26.7Z"/>
  <path class="st0" d="M19.89,422.09c0,.28,13.91-13.58,33.04-38.1-19.48,20.88-33.04,37.78-33.04,38.1Z"/>
  <path class="st0" d="M270.32,396.45c-14.26,15.03-24.96,22.55-32.95,24.94,9.7-1.59,33.07-6.14,58.03-16.35,7.96-14.09,20.07-35.57,33.04-58.83-16.16,17.97-38.87,36.17-58.12,50.23Z"/>
  <path class="st0" d="M345.64,294.76c2.97,4.04,4.15,8.58,3.87,13.49,9.27-16.83,18.1-33.03,25.28-46.56-.48-3.3-1-6.65-1.57-10.02-4.85,7.43-10.73,16.61-17.77,27.75-3.35,5.3-6.61,10.4-9.81,15.35Z"/>
  <path class="st0" d="M281.88,803.17s99.97,4.58,69.85-135.87c-6.35-29.59-16-57.61-27.27-83.42l-81.71,181.24c81.9-329.14-69.85,65.79-69.85,65.79h207.56v-4.78c-70.29-10-160.1-27.55-160.1-27.55l61.52,4.58Z"/>
  <path class="st0" d="M217.27,422.46H88.57s181.92,320.16,69.6,142.5C-9.51,299.72,19.45,485.09,19.45,485.09l34.03,270.38c-18.08-310.21,108.49,100.04,99.95,70.01-141.74-498.51,54.4-84.97,83.91-160.19,27.42-69.88-78.04-230.85,1.75-217.05-12.53-14.01-20.86-24.35-21.83-25.78Z"/>
  <path class="st0" d="M240.7,448.54c22.75,4.46,59.81,22.4,117.95,59.49l-12.9,28.61c14.57,3.36,25.72-8.81,34.7-26.32v-87.85h-163.07c1.48,1.32,10.48,10.5,23.31,26.07Z"/>
  <path class="st0" d="M429.91,422.28s199.93,123.66,76.9,143.5c-123.03,19.85-66-107.63-84.59-138.92-12.46-20.97-21.75,44.45-41.76,83.45v315.82c12.62,1.79,24.62,3.35,35.35,4.51,70.49,7.63-87.79-475.54-3.84-209.14,83.95,266.39,164.69,16.79,163.41-82.44-1.28-99.23-145.46-116.79-145.46-116.79Z"/>
  <path class="st0" d="M217.16,422.28s.04.08.11.18h.13c-.14-.13-.23-.2-.23-.18Z"/>
  <path class="st0" d="M341.48,535.25c-28.91-12.21-65.34-47.06-91.28-74.86,22.25,28.53,51.55,71.5,74.26,123.49l21.3-47.24c-1.4-.32-2.82-.77-4.28-1.39Z"/>
  <path class="st0" d="M239.1,448.24c3.41,3.81,7.13,7.9,11.1,12.15-3.34-4.28-6.52-8.24-9.5-11.85-.54-.11-1.08-.21-1.6-.3Z"/>
  <path class="st0" d="M270.32,396.45c18.49-19.49,42.98-51.64,75.32-101.69-5.41-7.36-16.77-13.05-36.1-16.17-123.03-19.85-66,107.63-84.59,138.92-.41.69-.82,1.26-1.23,1.77,3.29,2.86,7.73,3.89,13.65,2.11-3.03.5-4.73.7-4.73.7,0,0,16.81-10.4,37.68-25.64Z"/>
  <path class="st0" d="M370.18,13.46s151.75,394.94,69.85,65.79l115.9,257.1c-269.74,172.07-86.13-67.59-121.31-157.26-10.1-25.74-39.7,5.74-68.6,38.33,2.89,11.49,5.31,23.05,7.2,34.25,28.48-43.64,21.06-26.66,1.57,10.02,2.31,16.05,3.47,31.04,3.31,43.62-.7,53.96-43.65,83.77-82.7,99.74-5.92,10.48-9.56,16.87-9.56,16.87h291.89V13.46h-207.56Z"/>
  <path class="st0" d="M349.51,308.25c-6.94,12.59-14.13,25.53-21.07,37.97,12.03-13.38,20.43-26.64,21.07-37.97Z"/>
  <path class="st0" d="M323.22,120.56c7.23-28.67,16.3-62.32,27.49-101.66,3.29-11.56-13.45,42.13-34.25,94.85,2.3,2.01,4.55,4.29,6.76,6.82Z"/>
  <path class="st0" d="M250.75,88.91l-7.87,62.55c2.04-3.94,4.08-7.61,6.11-11.01.03-14.37.59-31.43,1.76-51.54Z"/>
</svg>`;

function attachShapeDragging(svgCanvas) {
  const svg = svgCanvas?.querySelector('svg');
  if (!svg) return;

  // Delegate drag handling so new shapes work after every import
  const draggableSelectors = 'path, rect, circle, ellipse, line, polyline, polygon, g';
  let activeShape = null;
  let selectedShape = null;
  let startPoint = null;
  let startTranslate = { x: 0, y: 0 };
  let baseTransform = '';
  let isDragging = false;

  const svgPointFromEvent = (event) => {
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const ctm = svg.getScreenCTM();
    return ctm ? point.matrixTransform(ctm.inverse()) : point;
  };

  const extractTransform = (element) => {
    const transform = element.getAttribute('transform') || '';
    const match = transform.match(/translate\(\s*([-\d.]+)[ ,]([-\d.]+)\s*\)/);
    const translate = match ? { x: parseFloat(match[1]) || 0, y: parseFloat(match[2]) || 0 } : { x: 0, y: 0 };
    const base = match ? transform.replace(match[0], '').trim() : transform.trim();
    return { translate, base };
  };

  const clearSelection = () => {
    if (selectedShape) {
      selectedShape.classList.remove('selected-shape');
      selectedShape = null;
    }
    // Deselect in area text system
    areaTextState.selectedShapeId = null;
    syncUIToSelectedShape();
  };

  const setSelection = (shapeEl, wrapperEl) => {
    clearSelection();
    // Apply selection class on the visible shape element (not the wrapper) for border styling
    selectedShape = shapeEl;
    selectedShape.classList.add('selected-shape');
    
    const areaTextShape = areaTextState.shapes.find(s => s.wrapper === wrapperEl || s.el === shapeEl);
    if (areaTextShape) {
      areaTextState.selectedShapeId = areaTextShape.id;
      syncUIToSelectedShape();
    }
  };

  const pointerMove = (event) => {
    if (!activeShape || !startPoint || !isDragging) return;
    const point = svgPointFromEvent(event);
    const dx = point.x - startPoint.x;
    const dy = point.y - startPoint.y;
    const tx = startTranslate.x + dx;
    const ty = startTranslate.y + dy;
    
    // Update shape transform in area text model
    const shape = areaTextState.shapes.find(s => s.wrapper === activeShape);
    if (shape) {
      shape.transform = { translateX: tx, translateY: ty };
      applyShapeTransform(shape);
    }
  };

  const pointerUp = () => {
    svg.style.cursor = 'auto';
    isDragging = false;
    activeShape = null;
    startPoint = null;
    svg.removeEventListener('pointermove', pointerMove);
    svg.removeEventListener('pointerup', pointerUp);
    svg.removeEventListener('pointerleave', pointerUp);
  };

  const pointerDown = (event) => {
    const target = event.target.closest(draggableSelectors);
    
    if (!target || !svg.contains(target)) {
      // Click on empty canvas - deselect
      clearSelection();
      return;
    }

    event.preventDefault();

    // Resolve wrapper and base shape element so we always drag the wrapper
    const wrapperEl = target.closest('.shapeWrap') || target;
    const shapeEl = wrapperEl.classList.contains('shapeWrap') ? wrapperEl.querySelector('path, rect, circle, ellipse, line, polyline, polygon') || target : target;

    // Select the shape (uses wrapper for state, shapeEl for visual selection)
    setSelection(shapeEl, wrapperEl);

    // Prepare for dragging using wrapper's current translate
    const { translate } = extractTransform(wrapperEl);
    activeShape = wrapperEl;
    startPoint = svgPointFromEvent(event);
    startTranslate = translate;
    isDragging = true;

    svg.style.cursor = 'grabbing';

    svg.addEventListener('pointermove', pointerMove);
    svg.addEventListener('pointerup', pointerUp);
    svg.addEventListener('pointerleave', pointerUp);
  };

  const pointerEnter = (event) => {
    if (event.target.closest(draggableSelectors)) {
      svg.style.cursor = 'grab';
    }
  };

  const pointerLeave = () => {
    if (!activeShape) {
      svg.style.cursor = 'auto';
    }
  };

  svg.addEventListener('pointerdown', pointerDown);
  svg.addEventListener('pointermove', pointerEnter);
  svg.addEventListener('pointerleave', pointerLeave);
}

function renderSVG(svgString, container) {
  container.innerHTML = svgString;
  const svg = container.querySelector('svg');
  if (svg) {
    svg.style.maxWidth = '100%';
    svg.style.maxHeight = '100%';
    svg.style.display = 'block';
    svg.style.margin = 'auto';
  }

  attachShapeDragging(container);
  
  // Initialize area text system for the new SVG
  initializeShapeModel();
  bindUIControls();
  syncUIToSelectedShape();
}

/* ============================================
   SVG EXPORT FUNCTIONALITY
   Exports the current SVG as a downloadable file
   ============================================ */

function exportSVGFile() {
  const svgCanvas = document.getElementById('svg-canvas');
  const svg = svgCanvas?.querySelector('svg');
  
  if (!svg) {
    alert('No SVG to export. Please import an SVG file first.');
    return;
  }

  // Clone the SVG to avoid modifying the original
  const svgClone = svg.cloneNode(true);
  
  // Remove any transform attributes for a cleaner export (optional)
  // Comment out the following 3 lines if you want to keep positioning transforms
  svgClone.querySelectorAll('[transform]').forEach(el => {
    const transform = el.getAttribute('transform');
    if (transform && transform.includes('translate')) {
      // Keep other transforms but clean up if needed
      // el.removeAttribute('transform');
    }
  });

  // Convert SVG to string
  const serializer = new XMLSerializer();
  let svgString = serializer.serializeToString(svgClone);
  
  // Add XML declaration if not present
  if (!svgString.startsWith('<?xml')) {
    svgString = '<?xml version="1.0" encoding="UTF-8"?>\n' + svgString;
  }

  // Create a Blob from the SVG string
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  
  // Create a temporary download link
  const url = URL.createObjectURL(blob); 
  const link = document.createElement('a');
  link.href = url;
  link.download = 'export-number-T-TA.svg';
  
  // Trigger download
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the object URL
  URL.revokeObjectURL(url);
}

function initializeSVGImport() {
  const importBtn = document.getElementById('import-svg-btn');
  const fileInput = document.getElementById('svg-file-input');
  const svgCanvas = document.getElementById('svg-canvas');
  const clearBtn = document.getElementById('clear-canvas-btn');
  const exportBtn = document.getElementById('export-svg-btn');
  const canvasRectangle = document.getElementById('canvas-rectangle');

  if (!importBtn || !fileInput || !svgCanvas) return;

  const toggleRectangle = (show) => {
    if (canvasRectangle) {
      canvasRectangle.style.display = show ? 'flex' : 'none';
    }
  };

  const handleSvgString = (svgString) => {
    renderSVG(svgString, svgCanvas);
    toggleRectangle(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.name.endsWith('.svg')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      handleSvgString(e.target.result);
    };
    reader.readAsText(file);
  };

  // Load default SVG on page load (keep rectangle visible as overlay)
  renderSVG(DEFAULT_SVG, svgCanvas);

  importBtn.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      handleSvgString(event.target.result);
    };
    reader.readAsText(file);
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      svgCanvas.innerHTML = '';
      toggleRectangle(false);
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', exportSVGFile);
  }

  // Drag and drop support
  const attachDragTargets = (el) => {
    if (!el) return;
    el.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    el.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    el.addEventListener('drop', handleDrop);
  };

  attachDragTargets(svgCanvas);
  attachDragTargets(canvasRectangle);
}

document.addEventListener('DOMContentLoaded', initializeSVGImport);

/* ============================================
   TEXT INPUT INTERACTION
   Changes rectangle color when typing
   ============================================ */

function initializeTextInputInteraction() {
  const textInput = document.querySelector('.text-input-field');
  const inputBox = document.querySelector('.input-text-box:not(.output-text-box)');
  const outputBox = document.querySelector('.output-text-box');
  const toggleOptions = document.querySelectorAll('.toggle-option');
  const segmentedToggle = document.querySelector('.segmented-toggle');

  if (!textInput || !inputBox) return;

  // Change to red when focused or when typing
  textInput.addEventListener('focus', () => {
    inputBox.style.backgroundColor = '#ff3f28';
  });

  textInput.addEventListener('input', () => {
    inputBox.style.backgroundColor = '#ff3f28';
  });

  // Change back to black when clicking outside
  textInput.addEventListener('blur', () => {
    inputBox.style.backgroundColor = '#000000';
  });

  // Handle segmented toggle interaction - only change the "Text Mode" box
  if (segmentedToggle && outputBox) {
    segmentedToggle.addEventListener('mousedown', () => {
      outputBox.style.backgroundColor = '#ff3f28';
    });

    segmentedToggle.addEventListener('touchstart', () => {
      outputBox.style.backgroundColor = '#ff3f28';
    });
  }

  // Handle toggle option clicks
  if (toggleOptions.length > 0 && outputBox) {
    toggleOptions.forEach(option => {
      option.addEventListener('mousedown', () => {
        outputBox.style.backgroundColor = '#ff3f28';
      });

      option.addEventListener('touchstart', () => {
        outputBox.style.backgroundColor = '#ff3f28';
      });
    });
  }

  // Change back to black when mouse/touch ends with a delay
  document.addEventListener('mouseup', () => {
    if (outputBox && !textInput.matches(':focus')) {
      setTimeout(() => {
        outputBox.style.backgroundColor = '#000000';
      }, 800);
    }
  });

  document.addEventListener('touchend', () => {
    if (outputBox && !textInput.matches(':focus')) {
      setTimeout(() => {
        outputBox.style.backgroundColor = '#000000';
      }, 800);
    }
  });
}

/* ============================================
   SEGMENTED TOGGLE CONTROL INTERACTION
   Handles click and drag for two-option slider
   ============================================ */

function initializeSegmentedToggle() {
  const toggle = document.querySelector('.segmented-toggle');
  if (!toggle) return;

  const slider = toggle.querySelector('.toggle-slider');
  const options = toggle.querySelectorAll('.toggle-option');
  
  let currentPosition = 0; // 0 = left (fill), 1 = right (outline)

  // Set initial position to fill
  setActiveOption(0);

  // Click handler for options
  options.forEach((option, index) => {
    option.addEventListener('click', () => {
      setActiveOption(index);
    });
  });

  function setActiveOption(index) {
    currentPosition = index;
    updateSliderPosition(index);
    // Update active states
    options.forEach((opt, i) => {
      if (i === index) {
        opt.classList.add('active');
      } else {
        opt.classList.remove('active');
      }
    });
    applyTextMode(index);
  }
  // Expose setActiveOption globally so syncUIToSelectedShape can call it
  window.setActiveTextModeOption = setActiveOption;

  function updateSliderPosition(index) {
    const toggleWidth = toggle.offsetWidth;
    const sliderWidth = toggleWidth / 2;
    const translateX = index * sliderWidth;
    slider.style.transform = `translateX(${translateX}px)`;
  }

  function applyTextMode(index) {
    const mode = index === 0 ? 'fill' : 'outline';
    const activeShape = findShapeById(areaTextState.selectedShapeId);
    if (!activeShape) return;
    activeShape.renderMode = mode;
    renderShapeText(activeShape);
  }
  
  // Make updateSliderPosition accessible globally for resize updates
  window.updateToggleSlider = function() {
    updateSliderPosition(currentPosition);
  };
}

/* ============================================
   FONT SELECTION INTERACTION
   Handles font dropdown, size controls, and file upload
   ============================================ */

function initializeFontSelection() {
  const fontNameButton = document.getElementById('font-name-button');
  const fontDropdown = document.getElementById('font-dropdown-menu');
  const fontOptions = document.querySelectorAll('.font-option');
  const fontSizeInput = document.getElementById('font-size-input');
  const fontSizeUpBtn = document.getElementById('font-size-up');
  const fontSizeDownBtn = document.getElementById('font-size-down');
  const fontUploadButton = document.getElementById('font-upload-button');
  const fontFileInput = document.getElementById('font-file-input');

  if (!fontNameButton || !fontDropdown || !fontSizeInput || !fontUploadButton) return;

  // Font dropdown toggle
  fontNameButton.addEventListener('click', (e) => {
    e.stopPropagation();
    fontDropdown.classList.toggle('active');
  });

  // Font option selection
  fontOptions.forEach(option => {
    option.addEventListener('click', (e) => {
      e.stopPropagation();
      const selectedFont = option.getAttribute('data-font');
      fontNameButton.querySelector('p').textContent = selectedFont;
      fontDropdown.classList.remove('active');
      
      // Update area text with new font
      if (areaTextState.selectedShapeId) {
        updateSelectedShapeTypography('fontFamily', selectedFont);
      }
    });
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!fontNameButton.contains(e.target) && !fontDropdown.contains(e.target)) {
      fontDropdown.classList.remove('active');
    }
  });

  // Close dropdown on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && fontDropdown.classList.contains('active')) {
      fontDropdown.classList.remove('active');
    }
  });

  // Font size increment
  fontSizeUpBtn.addEventListener('click', () => {
    fontSizeInput.value = Math.min(72, parseInt(fontSizeInput.value) + 1);
    fontSizeInput.dispatchEvent(new Event('change', { bubbles: true }));
  });

  // Font size decrement
  fontSizeDownBtn.addEventListener('click', () => {
    fontSizeInput.value = Math.max(8, parseInt(fontSizeInput.value) - 1);
    fontSizeInput.dispatchEvent(new Event('change', { bubbles: true }));
  });

  // Font size input validation and area text update
  fontSizeInput.addEventListener('change', () => {
    let value = parseInt(fontSizeInput.value);
    if (isNaN(value) || value < 8) value = 8;
    if (value > 72) value = 72;
    fontSizeInput.value = value;
    
    // Update area text with new font size
    if (areaTextState.selectedShapeId) {
      updateSelectedShapeTypography('fontSize', value);
    }
  });

  // Font file upload
  fontUploadButton.addEventListener('click', () => {
    fontFileInput.click();
  });

  fontFileInput.addEventListener('change', async (e) => {
    if (e.target.files.length > 0) {
      for (let file of e.target.files) {
        await loadCustomFontFromFile(file, fontNameButton, fontDropdown);
      }
      // Reset file input so same file can be uploaded again
      fontFileInput.value = '';
    }
  });
}

/**
 * Load custom font from file and add to dropdown
 */
const loadedFonts = new Map();

async function loadCustomFontFromFile(file, fontNameButton, fontDropdown) {
  try {
    // Get font name from filename (without extension)
    const fileName = file.name;
    const familyName = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
    
    // Check if already loaded
    if (loadedFonts.has(familyName)) {
      console.log(`Font ${familyName} already loaded`);
      applyFontToSelectedShape(familyName, fontNameButton, fontDropdown);
      return;
    }
    
    // Read file and create FontFace
    const arrayBuffer = await file.arrayBuffer();
    const blob = new Blob([arrayBuffer]);
    const url = URL.createObjectURL(blob);
    
    const fontFace = new FontFace(familyName, `url(${url})`, {
      style: 'normal',
      weight: 'normal',
    });
    
    // Load and add font
    await fontFace.load();
    document.fonts.add(fontFace);
    loadedFonts.set(familyName, url);
    
    console.log(`Font loaded: ${familyName}`);
    
    // Add to dropdown if not already present
    const existingOption = Array.from(fontDropdown.querySelectorAll('.font-option'))
      .find(opt => opt.getAttribute('data-font') === familyName);
    
    if (!existingOption) {
      const fontOption = document.createElement('div');
      fontOption.classList.add('font-option');
      fontOption.setAttribute('data-font', familyName);
      fontOption.innerHTML = `<span>${familyName}</span>`;
      fontDropdown.appendChild(fontOption);
      
      // Wire click handler to new option
      fontOption.addEventListener('click', (e) => {
        e.stopPropagation();
        fontNameButton.querySelector('p').textContent = familyName;
        fontDropdown.classList.remove('active');
        if (areaTextState.selectedShapeId) {
          updateSelectedShapeTypography('fontFamily', familyName);
        }
      });
    }
    
    // Apply to selected shape
    applyFontToSelectedShape(familyName, fontNameButton, fontDropdown);
    
  } catch (error) {
    console.error('Error loading custom font:', error);
    alert(`Failed to load font: ${error.message}`);
  }
}

/**
 * Apply font to selected shape and update UI
 */
function applyFontToSelectedShape(familyName, fontNameButton, fontDropdown) {
  // Update dropdown display
  fontNameButton.querySelector('p').textContent = familyName;
  fontDropdown.classList.remove('active');
  
  // Apply to selected shape
  if (areaTextState.selectedShapeId) {
    updateSelectedShapeTypography('fontFamily', familyName);
  }
}

document.addEventListener('DOMContentLoaded', initializeFontSelection);

/* ============================================
   FONT WEIGHT SLIDER INTERACTION
   Handles font weight slider updates
   ============================================ */

function initializeFontWeightSlider() {
  const fontWeightSlider = document.getElementById('font-weight-slider');
  const fontWeightLabel = document.querySelector('.font-weight-label');

  if (!fontWeightSlider || !fontWeightLabel) return;

  // Add active class when slider is being used
  fontWeightSlider.addEventListener('mousedown', () => {
    fontWeightLabel.classList.add('active');
  });

  fontWeightSlider.addEventListener('touchstart', () => {
    fontWeightLabel.classList.add('active');
  });

  // Remove active class when slider is released
  document.addEventListener('mouseup', () => {
    fontWeightLabel.classList.remove('active');
  });

  document.addEventListener('touchend', () => {
    fontWeightLabel.classList.remove('active');
  });

  // Update font weight in real time as slider moves
  fontWeightSlider.addEventListener('input', (e) => {
    const weight = e.target.value;
    console.log('Font weight changed to:', weight);
    // Apply font weight to text elements here
    // Example: document.body.style.fontWeight = weight;
  });

  // Optional: handle change event for final value
  fontWeightSlider.addEventListener('change', (e) => {
    const weight = e.target.value;
    console.log('Font weight finalized at:', weight);
  });
}

/* ============================================
   LINE HEIGHT SLIDER INTERACTION
   Handles line height slider updates
   ============================================ */

function initializeLineHeightSlider() {
  const lineHeightSlider = document.getElementById('line-height-slider');
  const lineHeightLabel = document.querySelector('.line-height-label');

  if (!lineHeightSlider || !lineHeightLabel) return;

  // Add active class when slider is being used
  lineHeightSlider.addEventListener('mousedown', () => {
    lineHeightLabel.classList.add('active');
  });

  lineHeightSlider.addEventListener('touchstart', () => {
    lineHeightLabel.classList.add('active');
  });

  // Remove active class when slider is released
  document.addEventListener('mouseup', () => {
    lineHeightLabel.classList.remove('active');
  });

  document.addEventListener('touchend', () => {
    lineHeightLabel.classList.remove('active');
  });

  // Update line height in real time as slider moves
  lineHeightSlider.addEventListener('input', (e) => {
    const lineHeight = e.target.value;
    console.log('Line height changed to:', lineHeight);
    // Apply line height to text elements here
  });

  // Optional: handle change event for final value
  lineHeightSlider.addEventListener('change', (e) => {
    const lineHeight = e.target.value;
    console.log('Line height finalized at:', lineHeight);
  });
}

/* ============================================
   LINE PACKING SLIDER INTERACTION
   Handles line packing slider updates
   ============================================ */

function initializeLinePackingSlider() {
  const linePackingSlider = document.getElementById('line-packing-slider');
  const linePackingLabel = document.querySelector('.line-packing-label');

  if (!linePackingSlider || !linePackingLabel) return;

  // Add active class when slider is being used
  linePackingSlider.addEventListener('mousedown', () => {
    linePackingLabel.classList.add('active');
  });

  linePackingSlider.addEventListener('touchstart', () => {
    linePackingLabel.classList.add('active');
  });

  // Remove active class when slider is released
  document.addEventListener('mouseup', () => {
    linePackingLabel.classList.remove('active');
  });

  document.addEventListener('touchend', () => {
    linePackingLabel.classList.remove('active');
  });

  // Update line packing in real time as slider moves
  linePackingSlider.addEventListener('input', (e) => {
    const linePacking = e.target.value;
    console.log('Line packing changed to:', linePacking);
    // Apply line packing to text elements here
  });

  // Optional: handle change event for final value
  linePackingSlider.addEventListener('change', (e) => {
    const linePacking = e.target.value;
    console.log('Line packing finalized at:', linePacking);
  });
}

/* ============================================
   TRACKING SLIDER INTERACTION
   Handles tracking slider updates
   ============================================ */

function initializeTrackingSlider() {
  const trackingSlider = document.getElementById('tracking-slider');
  const trackingLabel = document.querySelector('.tracking-label');

  if (!trackingSlider || !trackingLabel) return;

  // Add active class when slider is being used
  trackingSlider.addEventListener('mousedown', () => {
    trackingLabel.classList.add('active');
  });

  trackingSlider.addEventListener('touchstart', () => {
    trackingLabel.classList.add('active');
  });

  // Remove active class when slider is released
  document.addEventListener('mouseup', () => {
    trackingLabel.classList.remove('active');
  });

  document.addEventListener('touchend', () => {
    trackingLabel.classList.remove('active');
  });

  // Update tracking in real time as slider moves
  trackingSlider.addEventListener('input', (e) => {
    const tracking = e.target.value;
    console.log('Tracking changed to:', tracking);
    // Apply tracking to text elements here
  });

  // Optional: handle change event for final value
  trackingSlider.addEventListener('change', (e) => {
    const tracking = e.target.value;
    console.log('Tracking finalized at:', tracking);
  });
}

/* ============================================
   SCALE SLIDER INTERACTION
   Handles scale slider updates
   ============================================ */

function initializeScaleSlider() {
  const scaleSlider = document.getElementById('scale-slider');
  const scaleLabel = document.querySelector('.scale-label');

  if (!scaleSlider || !scaleLabel) return;

  // Add active class when slider is being used
  scaleSlider.addEventListener('mousedown', () => {
    scaleLabel.classList.add('active');
  });

  scaleSlider.addEventListener('touchstart', () => {
    scaleLabel.classList.add('active');
  });

  // Remove active class when slider is released
  document.addEventListener('mouseup', () => {
    scaleLabel.classList.remove('active');
  });

  document.addEventListener('touchend', () => {
    scaleLabel.classList.remove('active');
  });

  // Update scale in real time as slider moves
  scaleSlider.addEventListener('input', (e) => {
    const scale = e.target.value;
    console.log('Scale changed to:', scale);
    // Apply scale to shape elements here
  });

  // Optional: handle change event for final value
  scaleSlider.addEventListener('change', (e) => {
    const scale = e.target.value;
    console.log('Scale finalized at:', scale);
  });
}

/* ============================================
   ROTATION SLIDER INTERACTION
   Handles rotation slider updates
   ============================================ */

function initializeRotationSlider() {
  const rotationSlider = document.getElementById('rotation-slider');
  const rotationLabel = document.querySelector('.rotation-label');

  if (!rotationSlider || !rotationLabel) return;

  // Add active class when slider is being used
  rotationSlider.addEventListener('mousedown', () => {
    rotationLabel.classList.add('active');
  });

  rotationSlider.addEventListener('touchstart', () => {
    rotationLabel.classList.add('active');
  });

  // Remove active class when slider is released
  document.addEventListener('mouseup', () => {
    rotationLabel.classList.remove('active');
  });

  document.addEventListener('touchend', () => {
    rotationLabel.classList.remove('active');
  });

  // Update rotation in real time as slider moves
  rotationSlider.addEventListener('input', (e) => {
    const rotation = e.target.value;
    console.log('Rotation changed to:', rotation);
    // Apply rotation to shape elements here
  });

  // Optional: handle change event for final value
  rotationSlider.addEventListener('change', (e) => {
    const rotation = e.target.value;
    console.log('Rotation finalized at:', rotation);
  });
}

/* ============================================
   MOTION TOGGLE INTERACTION
   Handles On/Off toggle for motion
   ============================================ */

function initializeMotionToggle() {
  const motionToggle = document.querySelector('.motion-toggle');
  const motionToggleSlider = document.querySelector('.motion-toggle-slider');
  const motionToggleOptions = document.querySelectorAll('.motion-toggle-option');

  if (!motionToggle || !motionToggleSlider) return;

  motionToggleOptions.forEach((option, index) => {
    option.addEventListener('click', () => {
      // Remove active class from all options
      motionToggleOptions.forEach(opt => opt.classList.remove('active'));
      
      // Add active class to clicked option
      option.classList.add('active');
      
      // Move slider
      const translateX = index * 100;
      motionToggleSlider.style.transform = `translateX(${translateX}%)`;
      
      // Get the selected value
      const value = option.getAttribute('data-value');
      console.log('Motion toggle changed to:', value);
      
      // Enable/disable motion based on selection
      if (value === 'off') {
        // Disable motion
        console.log('Motion disabled');
      } else {
        // Enable motion
        console.log('Motion enabled');
      }
    });
  });
}

/* ============================================
   SPEED SLIDER INTERACTION
   Handles speed slider updates
   ============================================ */

function initializeSpeedSlider() {
  const speedSlider = document.getElementById('speed-slider');
  const speedLabel = document.querySelector('.speed-label');

  if (!speedSlider || !speedLabel) return;

  // Add active class when slider is being used
  speedSlider.addEventListener('mousedown', () => {
    speedLabel.classList.add('active');
  });

  speedSlider.addEventListener('touchstart', () => {
    speedLabel.classList.add('active');
  });

  // Remove active class when slider is released
  document.addEventListener('mouseup', () => {
    speedLabel.classList.remove('active');
  });

  document.addEventListener('touchend', () => {
    speedLabel.classList.remove('active');
  });

  // Update speed in real time as slider moves
  speedSlider.addEventListener('input', (e) => {
    const speed = e.target.value;
    console.log('Speed changed to:', speed);
    // Apply speed to motion here
  });

  // Optional: handle change event for final value
  speedSlider.addEventListener('change', (e) => {
    const speed = e.target.value;
    console.log('Speed finalized at:', speed);
  });
}

/* ============================================
   AMOUNT SLIDER INTERACTION
   Handles amount slider updates
   ============================================ */

function initializeAmountSlider() {
  const amountSlider = document.getElementById('amount-slider');
  const amountLabel = document.querySelector('.amount-label');

  if (!amountSlider || !amountLabel) return;

  // Add active class when slider is being used
  amountSlider.addEventListener('mousedown', () => {
    amountLabel.classList.add('active');
  });

  amountSlider.addEventListener('touchstart', () => {
    amountLabel.classList.add('active');
  });

  // Remove active class when slider is released
  document.addEventListener('mouseup', () => {
    amountLabel.classList.remove('active');
  });

  document.addEventListener('touchend', () => {
    amountLabel.classList.remove('active');
  });

  // Update amount in real time as slider moves
  amountSlider.addEventListener('input', (e) => {
    const amount = e.target.value;
    console.log('Amount changed to:', amount);
    // Apply amount to motion here
  });

  // Optional: handle change event for final value
  amountSlider.addEventListener('change', (e) => {
    const amount = e.target.value;
    console.log('Amount finalized at:', amount);
  });
}

/* ============================================
   MODE SELECTION INTERACTION
   Handles Wave/Pulse/Stretch mode selection
   ============================================ */

function initializeModeSelection() {
  const modeOptions = document.querySelectorAll('.mode-option');

  if (!modeOptions.length) return;

  modeOptions.forEach(option => {
    option.addEventListener('click', () => {
      // Remove active class from all options
      modeOptions.forEach(opt => opt.classList.remove('active'));
      
      // Add active class to clicked option
      option.classList.add('active');
      
      // Get the selected mode
      const mode = option.getAttribute('data-mode');
      console.log('Motion mode changed to:', mode);
      
      // Apply the selected motion mode
      // This will be implemented based on motion logic
    });
  });
}

document.addEventListener('DOMContentLoaded', initializeFontWeightSlider);
document.addEventListener('DOMContentLoaded', initializeLineHeightSlider);
document.addEventListener('DOMContentLoaded', initializeLinePackingSlider);
document.addEventListener('DOMContentLoaded', initializeTrackingSlider);
document.addEventListener('DOMContentLoaded', initializeScaleSlider);
document.addEventListener('DOMContentLoaded', initializeRotationSlider);
document.addEventListener('DOMContentLoaded', function() {
  // Ensure Play Motion toggle is always OFF on load
  var motionToggle = document.querySelector('.motion-toggle');
  var options = motionToggle ? motionToggle.querySelectorAll('.motion-toggle-option') : null;
  var slider = motionToggle ? motionToggle.querySelector('.motion-toggle-slider') : null;
  if (options && options.length === 2 && slider) {
    // Remove active from both, set OFF active
    options.forEach(opt => opt.classList.remove('active'));
    options[1].classList.add('active'); // OFF is second
    slider.style.transform = 'translateX(100%)';
  }
  initializeMotionToggle();
});
document.addEventListener('DOMContentLoaded', initializeSpeedSlider);
document.addEventListener('DOMContentLoaded', initializeAmountSlider);
document.addEventListener('DOMContentLoaded', initializeModeSelection);

document.addEventListener('DOMContentLoaded', initializeTextInputInteraction);
document.addEventListener('DOMContentLoaded', initializeSegmentedToggle);

/* ============================================
   AREA TEXT SYSTEM
   Illustrator-style area text for SVG shapes
   ============================================ */

// Global state for area text
const areaTextState = {
  shapes: [], // Array of { id, el, pathD, bbox, transform, areaText: { text, fontFamily, fontSize, fontWeight, lineHeight, packing, tracking } }
  selectedShapeId: null,
  textWidthCache: {}, // Cache for glyph measurements
  scanlineCache: {}, // Cache for scanline intersections
};

// ============================================
// GEOMETRY UTILITIES
// ============================================

/**
 * Parse SVG path data into a normalized form
 * Returns the path d attribute directly (used with Path2D)
 */
function parsePathData(element) {
  if (element.tagName === 'path') {
    return element.getAttribute('d') || '';
  }
  
  // Convert other shapes to path data
  const tag = element.tagName.toLowerCase();
  const d = element.getAttribute('d');
  if (d) return d;
  
  switch (tag) {
    case 'rect': {
      const x = parseFloat(element.getAttribute('x')) || 0;
      const y = parseFloat(element.getAttribute('y')) || 0;
      const width = parseFloat(element.getAttribute('width')) || 0;
      const height = parseFloat(element.getAttribute('height')) || 0;
      const rx = parseFloat(element.getAttribute('rx')) || 0;
      return `M${x + rx},${y} h${width - 2 * rx} a${rx},${rx} 0 0 1 ${rx},${rx} v${height - 2 * rx} a${rx},${rx} 0 0 1 -${rx},${rx} h-${width - 2 * rx} a${rx},${rx} 0 0 1 -${rx},-${rx} v-${height - 2 * rx} a${rx},${rx} 0 0 1 ${rx},-${rx} z`;
    }
    case 'circle': {
      const cx = parseFloat(element.getAttribute('cx')) || 0;
      const cy = parseFloat(element.getAttribute('cy')) || 0;
      const r = parseFloat(element.getAttribute('r')) || 0;
      return `M${cx - r},${cy} a${r},${r} 0 1 0 ${2 * r},0 a${r},${r} 0 1 0 -${2 * r},0`;
    }
    case 'ellipse': {
      const cx = parseFloat(element.getAttribute('cx')) || 0;
      const cy = parseFloat(element.getAttribute('cy')) || 0;
      const rx = parseFloat(element.getAttribute('rx')) || 0;
      const ry = parseFloat(element.getAttribute('ry')) || 0;
      return `M${cx - rx},${cy} a${rx},${ry} 0 1 0 ${2 * rx},0 a${rx},${ry} 0 1 0 -${2 * rx},0`;
    }
    case 'polygon':
    case 'polyline': {
      const points = element.getAttribute('points') || '';
      const pointList = points.trim().split(/[\s,]+/).map(p => parseFloat(p));
      if (pointList.length < 2) return '';
      let pathD = `M${pointList[0]},${pointList[1]}`;
      for (let i = 2; i < pointList.length; i += 2) {
        pathD += ` L${pointList[i]},${pointList[i + 1]}`;
      }
      if (tag === 'polygon') pathD += ' Z';
      return pathD;
    }
    case 'line': {
      const x1 = parseFloat(element.getAttribute('x1')) || 0;
      const y1 = parseFloat(element.getAttribute('y1')) || 0;
      const x2 = parseFloat(element.getAttribute('x2')) || 0;
      const y2 = parseFloat(element.getAttribute('y2')) || 0;
      return `M${x1},${y1} L${x2},${y2}`;
    }
    default:
      return '';
  }
}

/**
 * Get bounding box of an element
 */
function getBoundingBox(element) {
  try {
    const bbox = element.getBBox();
    return { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height };
  } catch (e) {
    return { x: 0, y: 0, width: 100, height: 100 };
  }
}

/**
 * Point-in-path test using Path2D
 */
function isPointInPath(pathD, point, fillRule = 'nonzero') {
  try {
    const path = new Path2D(pathD);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    return ctx.isPointInPath(path, point.x, point.y, fillRule);
  } catch (e) {
    return false;
  }
}

/**
 * Find horizontal scanline intersections with path
 * Returns array of [xMin, xMax] intervals for a given y coordinate
 */
function getScanlineIntervals(pathD, y, yStep = 1, bbox = { x: -10000, y: -10000, width: 20000, height: 20000 }) {
  const intervals = [];
  let inPath = false;
  let startX = 0;
  const xMin = bbox.x;
  const xMax = bbox.x + bbox.width;
  const xStep = 0.1; // Fine resolution for intersection detection
  
  try {
    const path = new Path2D(pathD);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    for (let x = xMin; x <= xMax; x += xStep) {
      const pointInPath = ctx.isPointInPath(path, x, y, 'nonzero');
      
      if (pointInPath && !inPath) {
        startX = x;
        inPath = true;
      } else if (!pointInPath && inPath) {
        intervals.push([startX, x]);
        inPath = false;
      }
    }
    
    // Handle case where path extends to xMax
    if (inPath) {
      intervals.push([startX, xMax]);
    }
  } catch (e) {
    console.warn('Error in scanline intersection:', e);
  }
  
  // Merge overlapping intervals
  if (intervals.length > 1) {
    intervals.sort((a, b) => a[0] - b[0]);
    const merged = [intervals[0]];
    
    for (let i = 1; i < intervals.length; i++) {
      const last = merged[merged.length - 1];
      if (intervals[i][0] <= last[1] + 1) {
        last[1] = Math.max(last[1], intervals[i][1]);
      } else {
        merged.push(intervals[i]);
      }
    }
    
    return merged;
  }
  
  return intervals;
}

/**
 * Get approximate glyph width using canvas measurement
 */
function measureGlyphWidth(char, fontFamily, fontSize, fontWeight = 400) {
  const key = `${char}|${fontFamily}|${fontSize}|${fontWeight}`;
  
  if (areaTextState.textWidthCache[key]) {
    return areaTextState.textWidthCache[key];
  }
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = `${fontWeight} ${fontSize}px "${fontFamily}"`;
  
  const metrics = ctx.measureText(char);
  const width = metrics.width || (fontSize * 0.5); // Fallback estimate
  
  areaTextState.textWidthCache[key] = width;
  return width;
}

/**
 * Get transform matrix from element's transform attribute
 */
// ============================================
// SHAPE MANAGEMENT
// ============================================

/**
 * Initialize shape model from imported SVG
 */
function initializeShapeModel() {
  const svgCanvas = document.getElementById('svg-canvas');
  const svg = svgCanvas?.querySelector('svg');
  
  if (!svg) {
    areaTextState.shapes = [];
    return;
  }
  
  areaTextState.shapes = [];
  areaTextState.selectedShapeId = null;
  
  const selectors = 'path, rect, circle, ellipse, polygon, polyline';
  const shapes = svg.querySelectorAll(selectors);
  
  shapes.forEach((el, index) => {
    const pathD = parsePathData(el);
    if (!pathD) return;

    const bbox = getBoundingBox(el);

    // Check if shape is already in a wrapper (preserves position if re-initializing)
    let wrapper = el.parentElement;
    let existingShape = null;

    if (wrapper && wrapper.classList.contains('shapeWrap')) {
      // Wrapper already exists - find the shape model to preserve its state
      existingShape = areaTextState.shapes.find(s => s.wrapper === wrapper);
    } else {
      // Create new wrapper group for shape + area text
      wrapper = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      wrapper.classList.add('shapeWrap');

      // Move shape into wrapper
      el.parentNode.insertBefore(wrapper, el);
      wrapper.appendChild(el);

      // Clear shape's individual transform (will be on wrapper)
      el.removeAttribute('transform');
    }

    // Preserve existing transform state if shape existed, otherwise start fresh
    const transform = existingShape ? existingShape.transform : { translateX: 0, translateY: 0 };
    const scale = existingShape ? existingShape.scale : 1;
    const rotationDeg = existingShape ? existingShape.rotationDeg : 0;

    // Set demo text for a bigger shape (e.g., the second shape)
    let demoText = '';
    if (!existingShape && index === 1) {
      demoText = 'Type inside a shape!';
    }

    const shape = {
      id: existingShape ? existingShape.id : `shape_${index}_${Date.now()}`,
      el: el,
      wrapper: wrapper,
      pathD: pathD,
      bbox: bbox,
      transform: transform,
      renderMode: existingShape ? existingShape.renderMode : 'fill',
      scale: scale,
      rotationDeg: rotationDeg,
      areaText: existingShape ? existingShape.areaText : {
        text: demoText,
        fontFamily: 'Inter',
        fontSize: 12,
        fontWeight: 400,
        lineHeight: 1.75,
        packing: 50,
        tracking: 0,
      },
      textGroup: existingShape ? existingShape.textGroup : null,
      outlineGroup: existingShape ? existingShape.outlineGroup : null,
    };

    areaTextState.shapes.push(shape);

    // Apply transform from state (never from element attributes)
    applyShapeTransform(shape);
  });

  // Select the shape with demo text (if present), otherwise the first shape
  let demoShape = areaTextState.shapes.find(s => s.areaText.text === 'Type inside a shape!');
  if (demoShape) {
    areaTextState.selectedShapeId = demoShape.id;
    renderShapeText(demoShape);
    syncUIToSelectedShape();
  } else if (areaTextState.shapes.length > 0) {
    areaTextState.selectedShapeId = areaTextState.shapes[0].id;
    renderShapeText(areaTextState.shapes[0]);
    syncUIToSelectedShape();
  }
}

/**
 * Find shape by element (check wrapper or element itself)
 */
function findShapeByElement(el) {
  return areaTextState.shapes.find(s => s.el === el || s.wrapper === el);
}

/**
 * Find shape by ID
 */
function findShapeById(id) {
  return areaTextState.shapes.find(s => s.id === id);
}

// ============================================
// AREA TEXT LAYOUT & RENDERING
// ============================================

/**
 * Main area text layout algorithm
 * Computes text placement within shape bounds
 */
function layoutAreaText(shape) {
  const { pathD, bbox, areaText } = shape;
  const { text, fontFamily, fontSize, fontWeight, lineHeight, packing, tracking } = areaText;
  
  if (!text || text.length === 0) {
    return []; // No text to layout
  }
  
  const lines = [];
  const baseLineHeight = Math.max(1, fontSize * lineHeight);
  const yStep = baseLineHeight * (Math.max(1, packing) / 100); // Control vertical packing
  const textLen = text.length;
  
  let currentY = Math.ceil(bbox.y + fontSize * 0.75); // Start with baseline offset
  let textIndex = 0;
  let maxIterations = Math.ceil(bbox.height / yStep) + 50; // Prevent infinite loops
  let iterations = 0;
  
  console.log(`[Layout] Shape bbox:`, bbox, `Text: "${text}", FontSize: ${fontSize}, LineHeight: ${lineHeight}, Packing: ${packing}`);
  
  // Scanline algorithm
  while (currentY < bbox.y + bbox.height && iterations < maxIterations) {
    iterations++;
    
    // Get valid x intervals for this y
    const intervals = getScanlineIntervals(pathD, currentY, yStep, bbox);
    
    if (intervals.length === 0) {
      currentY += yStep;
      continue;
    }
    
    // Process each interval on this scanline
    for (let intervalIdx = 0; intervalIdx < intervals.length; intervalIdx++) {
      const [xMin, xMax] = intervals[intervalIdx];
      const availableWidth = Math.max(0, xMax - xMin);
      
      if (availableWidth < fontSize * 0.3) {
        continue; // Skip too-narrow intervals
      }
      
      const lineChars = [];
      let lineWidth = 0;
      let charsOnLine = 0;
      
      // Place glyphs left to right - loop text indefinitely to fill space
      while (charsOnLine < 10000 && lineWidth < availableWidth) {
        const charIdx = textIndex % textLen;
        const char = text[charIdx];
        const charWidth = measureGlyphWidth(char, fontFamily, fontSize, fontWeight);
        const trackingPx = (tracking || 0) / 100;
        const glyphAdvance = charWidth + trackingPx;
        
        if (lineWidth + glyphAdvance <= availableWidth) {
          lineChars.push({
            char: char,
            x: xMin + lineWidth,
            width: charWidth,
          });
          lineWidth += glyphAdvance;
          textIndex++;
          charsOnLine++;
        } else {
          break; // No more room on this interval
        }
      }
      
      if (lineChars.length > 0) {
        lines.push({
          y: currentY,
          chars: lineChars,
        });
      }
    }
    
    currentY += yStep;
  }
  
  console.log(`[Layout] Generated ${lines.length} lines with total ${lines.reduce((sum, l) => sum + l.chars.length, 0)} chars`);
  return lines;
}

/**
 * Render area text as SVG <text> elements within a <g>
 */
function renderAreaText(shape) {
  const svg = document.getElementById('svg-canvas')?.querySelector('svg');
  if (!svg) return;
  
  const { id, el, areaText, transform } = shape;

  // Only render area text when shape is in fill mode
  if (shape.renderMode !== 'fill') {
    // Clean up both text layers when not in fill mode
    if (shape.textGroup) {
      shape.textGroup.remove();
      shape.textGroup = null;
    }
    if (shape.outlineGroup) {
      shape.outlineGroup.remove();
      shape.outlineGroup = null;
    }
    // Restore original styles when not filling text
    if (shape._originalFill !== undefined) {
      el.style.fill = shape._originalFill;
    } else {
      el.style.fill = '';
    }
    if (shape._originalStroke !== undefined) {
      el.style.stroke = shape._originalStroke;
    } else {
      el.style.stroke = '';
    }
    if (shape._originalStrokeWidth !== undefined) {
      el.style.strokeWidth = shape._originalStrokeWidth;
    } else {
      el.style.strokeWidth = '';
    }
    return;
  }
  
  // Remove old text group
  if (shape.textGroup) {
    shape.textGroup.remove();
    shape.textGroup = null;
  }
  // Remove outline text if switching back to fill
  if (shape.outlineGroup) {
    shape.outlineGroup.remove();
    shape.outlineGroup = null;
  }
  
  if (!areaText.text || areaText.text.length === 0) {
    // Restore original styles when text is cleared
    if (shape._originalFill !== undefined) {
      el.style.fill = shape._originalFill;
    } else {
      el.style.fill = '';
    }
    if (shape._originalStroke !== undefined) {
      el.style.stroke = shape._originalStroke;
    } else {
      el.style.stroke = '';
    }
    if (shape._originalStrokeWidth !== undefined) {
      el.style.strokeWidth = shape._originalStrokeWidth;
    } else {
      el.style.strokeWidth = '';
    }
    return;
  }
  
  // Store original styles if not already stored
  if (shape._originalFill === undefined) {
    shape._originalFill = el.style.fill || getComputedStyle(el).fill || '';
    shape._originalStroke = el.style.stroke || getComputedStyle(el).stroke || '';
    shape._originalStrokeWidth = el.style.strokeWidth || getComputedStyle(el).strokeWidth || '';
  }
  
  // Make shape fill transparent - border shows only when selected (via .selected-shape class)
  el.style.fill = 'transparent';
  // Don't set permanent stroke - let selection styling handle it
  
  // Layout text
  const lines = layoutAreaText(shape);
  if (lines.length === 0) {
    console.warn(`No text lines generated for shape ${id}`);
    return;
  }
  
  // Create text group
  const textGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  textGroup.setAttribute('data-shape-id', id);
  textGroup.classList.add('area-text-group');
  
  // Apply same transform as the shape
  if (transform.x !== 0 || transform.y !== 0) {
    textGroup.setAttribute('transform', `translate(${transform.x} ${transform.y})`);
  }
  
  // Create text element for each line
  lines.forEach((line, lineIndex) => {
    if (line.chars.length === 0) return;
    
    const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textEl.setAttribute('x', line.chars[0]?.x || 0);
    textEl.setAttribute('y', line.y);
    textEl.setAttribute('font-family', areaText.fontFamily);
    textEl.setAttribute('font-size', areaText.fontSize);
    textEl.setAttribute('font-weight', areaText.fontWeight);
    textEl.setAttribute('fill', '#000000');
    textEl.setAttribute('pointer-events', 'none');
    
    // Create tspans for each glyph with proper positioning
    line.chars.forEach((glyphData, charIndex) => {
      const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
      tspan.setAttribute('x', glyphData.x);
      tspan.setAttribute('y', line.y);
      tspan.textContent = glyphData.char;
      textEl.appendChild(tspan);
    });
    
    textGroup.appendChild(textEl);
  });
  
  // Insert text group into wrapper (so it inherits wrapper's transform)
  shape.wrapper.appendChild(textGroup);
  shape.textGroup = textGroup;
  
  console.log(`Rendered ${lines.length} text lines for shape ${id}`);
}

/**
 * Render text along the shape outline using <textPath>
 */
function renderOutlineText(shape) {
  const svg = document.getElementById('svg-canvas')?.querySelector('svg');
  if (!svg) return;
  if (!shape.pathD) return;
  const { id, areaText } = shape;

  // Clear any existing outline group
  if (shape.outlineGroup) {
    shape.outlineGroup.remove();
    shape.outlineGroup = null;
  }
  // Also clear fill text if present
  if (shape.textGroup) {
    shape.textGroup.remove();
    shape.textGroup = null;
  }

  if (!areaText.text || areaText.text.length === 0) return;

  // Hidden path in defs inside the wrapper so it inherits wrapper transforms
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const pathId = `outline-${id}`;
  const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  pathEl.setAttribute('id', pathId);
  pathEl.setAttribute('d', shape.pathD);
  pathEl.setAttribute('fill', 'none');
  pathEl.setAttribute('stroke', 'none');
  pathEl.setAttribute('pointer-events', 'none');
  defs.appendChild(pathEl);

  // Text along path
  const outlineGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  outlineGroup.classList.add('outline-text-group');

  const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  textEl.setAttribute('xml:space', 'preserve');
  textEl.setAttribute('font-family', areaText.fontFamily);
  textEl.setAttribute('font-size', areaText.fontSize);
  textEl.setAttribute('font-weight', areaText.fontWeight);
  textEl.setAttribute('fill', '#000000');
  textEl.setAttribute('pointer-events', 'none');
  if (areaText.tracking) {
    textEl.style.letterSpacing = `${areaText.tracking}px`;
  }

  const textPath = document.createElementNS('http://www.w3.org/2000/svg', 'textPath');
  textPath.setAttributeNS('http://www.w3.org/1999/xlink', 'href', `#${pathId}`);
  textPath.setAttribute('startOffset', '0%');
  // Repeat text to cover the full outline length
  let repeatedText = areaText.text;
  try {
    const pathLength = typeof pathEl.getTotalLength === 'function' ? pathEl.getTotalLength() : null;
    if (pathLength && areaText.text.length > 0) {
      // Measure base text width including tracking
      let baseWidth = 0;
      for (let i = 0; i < areaText.text.length; i++) {
        const ch = areaText.text[i];
        baseWidth += measureGlyphWidth(ch, areaText.fontFamily, areaText.fontSize, areaText.fontWeight);
        if (areaText.tracking) {
          baseWidth += areaText.tracking;
        }
      }
      if (baseWidth > 0) {
        const repeats = Math.ceil(pathLength / baseWidth) + 2;
        repeatedText = areaText.text.repeat(Math.max(1, repeats));
      }
    }
  } catch (e) {
    // Fallback to single text content if length computation fails
    repeatedText = areaText.text;
  }
  textPath.textContent = repeatedText;

  textEl.appendChild(textPath);
  outlineGroup.appendChild(defs);
  outlineGroup.appendChild(textEl);

  // Insert into wrapper so it follows wrapper transforms
  shape.wrapper.appendChild(outlineGroup);
  shape.outlineGroup = outlineGroup;
}

/**
 * Render text for a shape based on its renderMode
 */
function renderShapeText(shape) {
  if (!shape) return;
  if (shape.renderMode === 'outline') {
    // Store original fill/stroke if not already stored
    if (shape._originalFill === undefined) {
      shape._originalFill = shape.el.style.fill || getComputedStyle(shape.el).fill || '';
      shape._originalStroke = shape.el.style.stroke || getComputedStyle(shape.el).stroke || '';
      shape._originalStrokeWidth = shape.el.style.strokeWidth || getComputedStyle(shape.el).strokeWidth || '';
    }
    
    // Make fill transparent so only outline/stroke is visible
    shape.el.style.fill = 'transparent';
    // Keep stroke visible for the outline
    
    renderOutlineText(shape);
  } else {
    // Back to fill mode - restore original fill
    if (shape._originalFill !== undefined) {
      shape.el.style.fill = shape._originalFill;
    } else {
      shape.el.style.fill = '';
    }
    renderAreaText(shape);
  }
}

/**
 * Update and re-render selected shape's text
 */
function updateSelectedShapeText(text) {
  const shape = findShapeById(areaTextState.selectedShapeId);
  if (!shape) return;
  
  shape.areaText.text = text;
  renderShapeText(shape);
}

/**
 * Update typography setting for selected shape
 */
function updateSelectedShapeTypography(setting, value) {
  const shape = findShapeById(areaTextState.selectedShapeId);
  if (!shape) return;
  
  if (shape.areaText.hasOwnProperty(setting)) {
    shape.areaText[setting] = value;
    renderShapeText(shape);
  }
}

// ============================================
// UI INTEGRATION
// ============================================

/**
 * Bind UI controls to area text
 */
/**
 * Apply transform to a shape: compose translate, rotate, and scale around center
 */
function applyShapeTransform(shape) {
  const wrapper = shape.wrapper;
  const bbox = shape.bbox;
  const cx = bbox.x + bbox.width / 2;
  const cy = bbox.y + bbox.height / 2;
  
  // Get base transform (from dragging or initial SVG)
  const baseTx = shape.transform ? shape.transform.translateX : 0;
  const baseTy = shape.transform ? shape.transform.translateY : 0;
  
  // Compose transform on wrapper: translate to position, translate to center, rotate, scale, translate back
  const transformStr = `translate(${baseTx}, ${baseTy}) translate(${cx}, ${cy}) rotate(${shape.rotationDeg}) scale(${shape.scale}) translate(${-cx}, ${-cy})`;
  wrapper.setAttribute('transform', transformStr);
}

function bindUIControls() {
  const textInput = document.querySelector('.text-input-field');
  const fontFamilyButton = document.getElementById('font-name-button');
  const fontSizeInput = document.getElementById('font-size-input');
  const fontWeightSlider = document.getElementById('font-weight-slider');
  const lineHeightSlider = document.getElementById('line-height-slider');
  const linePackingSlider = document.getElementById('line-packing-slider');
  const trackingSlider = document.getElementById('tracking-slider');
  const scaleSlider = document.getElementById('scale-slider');
  const rotationSlider = document.getElementById('rotation-slider');
  if (rotationSlider) {
    rotationSlider.min = -180;
    rotationSlider.max = 180;
    rotationSlider.step = 1;
  }
  
  if (textInput) {
    textInput.addEventListener('input', (e) => {
      updateSelectedShapeText(e.target.value);
    });
  }
  
  if (fontFamilyButton) {
    const fontOptions = fontFamilyButton.parentElement?.querySelectorAll('.font-option');
    fontOptions?.forEach(option => {
      option.addEventListener('click', () => {
        const fontFamily = option.getAttribute('data-font');
        if (fontFamily) {
          updateSelectedShapeTypography('fontFamily', fontFamily);
        }
      });
    });
  }
  
  if (fontSizeInput) {
    fontSizeInput.addEventListener('change', () => {
      const fontSize = Math.max(8, Math.min(72, parseInt(fontSizeInput.value) || 12));
      updateSelectedShapeTypography('fontSize', fontSize);
    });
  }
  
  if (fontWeightSlider) {
    fontWeightSlider.addEventListener('input', () => {
      const weight = parseInt(fontWeightSlider.value) || 400;
      updateSelectedShapeTypography('fontWeight', weight);
    });
  }
  
  if (lineHeightSlider) {
    lineHeightSlider.addEventListener('input', () => {
      const lineHeight = parseFloat(lineHeightSlider.value) || 1.75;
      updateSelectedShapeTypography('lineHeight', lineHeight);
    });
  }
  
  if (linePackingSlider) {
    linePackingSlider.addEventListener('input', () => {
      const packing = parseInt(linePackingSlider.value) || 50;
      updateSelectedShapeTypography('packing', packing);
    });
  }
  
  if (trackingSlider) {
    trackingSlider.addEventListener('input', () => {
      const tracking = parseInt(trackingSlider.value) || 0;
      updateSelectedShapeTypography('tracking', tracking);
    });
  }
  
  // Scale slider
  if (scaleSlider) {
    scaleSlider.addEventListener('input', () => {
      if (!areaTextState.selectedShapeId) return;
      const shape = findShapeById(areaTextState.selectedShapeId);
      if (!shape) return;
      
      shape.scale = parseFloat(scaleSlider.value);
      applyShapeTransform(shape);
    });
  }
  
  // Rotation slider
  if (rotationSlider) {
    rotationSlider.addEventListener('input', () => {
      if (!areaTextState.selectedShapeId) return;
      const shape = findShapeById(areaTextState.selectedShapeId);
      if (!shape) return;
      
      const val = parseFloat(rotationSlider.value);
      const clamped = Math.max(-180, Math.min(180, isNaN(val) ? 0 : val));
      shape.rotationDeg = clamped;
      rotationSlider.value = clamped;
      applyShapeTransform(shape);
    });
  }
}

/**
 * Update UI to reflect selected shape's text settings
 */
function syncUIToSelectedShape() {
  const shape = findShapeById(areaTextState.selectedShapeId);
  const textInput = document.querySelector('.text-input-field');
  const fontFamilyButton = document.getElementById('font-name-button');
  const fontSizeInput = document.getElementById('font-size-input');
  const fontWeightSlider = document.getElementById('font-weight-slider');
  const lineHeightSlider = document.getElementById('line-height-slider');
  const linePackingSlider = document.getElementById('line-packing-slider');
  const trackingSlider = document.getElementById('tracking-slider');
  const scaleSlider = document.getElementById('scale-slider');
  const rotationSlider = document.getElementById('rotation-slider');
  
  if (shape && shape.areaText) {
    if (textInput) textInput.value = shape.areaText.text || '';
    if (fontFamilyButton) fontFamilyButton.querySelector('p').textContent = shape.areaText.fontFamily;
    if (fontSizeInput) fontSizeInput.value = shape.areaText.fontSize;
    if (fontWeightSlider) fontWeightSlider.value = shape.areaText.fontWeight;
    if (lineHeightSlider) lineHeightSlider.value = shape.areaText.lineHeight;
    if (linePackingSlider) linePackingSlider.value = shape.areaText.packing;
    if (trackingSlider) trackingSlider.value = shape.areaText.tracking;
    
    // Sync scale slider: use value directly
    if (scaleSlider) {
      scaleSlider.value = shape.scale;
    }
    
    // Sync rotation slider: use value directly
    if (rotationSlider) {
      const clamped = Math.max(-180, Math.min(180, shape.rotationDeg || 0));
      rotationSlider.value = clamped;
    }

    // Sync Text Mode segmented toggle to shape's renderMode
    const modeIndex = shape.renderMode === 'outline' ? 1 : 0;
    if (typeof window.setActiveTextModeOption === 'function') {
      window.setActiveTextModeOption(modeIndex);
    }
  } else {
    // Clear UI when no shape selected
    if (textInput) textInput.value = '';
    if (scaleSlider) scaleSlider.value = 1; // Reset to 1.0 scale
    if (rotationSlider) rotationSlider.value = 0; // Reset to 0 degrees
  }
}

/**
 * Handle shape selection (integrate with existing selection system)
 */
function integrateAreaTextSelection(svgCanvas) {
  const svg = svgCanvas?.querySelector('svg');
  if (!svg) return;
  
  // Hook into existing selection mechanism
  const originalPointerDown = svg.onpointerdown;
  
  const draggableSelectors = 'path, rect, circle, ellipse, line, polyline, polygon';
  
  // Override the pointerDown handler to initialize area text on selection
  svg.addEventListener('pointerdown', (event) => {
    const target = event.target.closest(draggableSelectors);
    
    if (target && svg.contains(target)) {
      // Find the shape model
      const shape = findShapeByElement(target);
      
      if (shape) {
        areaTextState.selectedShapeId = shape.id;
        syncUIToSelectedShape();
      }
    } else {
      // Deselect
      areaTextState.selectedShapeId = null;
      syncUIToSelectedShape();
    }
  }, true); // Capture phase to ensure we run before other handlers
}

// ============================================
// INITIALIZATION & INTEGRATION WITH EXISTING CODE
// ============================================

/**
 * Initialize area text system when SVG is rendered
 */
function initializeAreaText() {
  const svgCanvas = document.getElementById('svg-canvas');
  
  // Initialize for default SVG on page load
  if (svgCanvas?.querySelector('svg')) {
    initializeShapeModel();
    bindUIControls();
    syncUIToSelectedShape();
  }
}

function showView(view) {
  var editorView = document.getElementById('editorView');
  var archiveView = document.getElementById('archiveView');
  if (view === 'archive') {
    editorView.style.display = 'none';
    archiveView.style.display = '';
    if (window.renderArchive) window.renderArchive();
    if (window.handleArchiveTopbar) window.handleArchiveTopbar(true);
  } else {
    editorView.style.display = '';
    archiveView.style.display = 'none';
    if (window.handleArchiveTopbar) window.handleArchiveTopbar(false);
  }
}

function handleHashChange() {
  if (window.location.hash === '#archive') {
    showView('archive');
  } else {
    showView('editor');
  }
}

document.addEventListener('DOMContentLoaded', function() {
  // Routing
  var archiveLink = document.getElementById('archive-link');
  if (archiveLink) {
    archiveLink.addEventListener('click', function(e) {
      e.preventDefault();
      window.location.hash = '#archive';
    });
  }
  var backBtn = document.getElementById('back-to-editor-btn');
  if (backBtn) {
    backBtn.addEventListener('click', function(e) {
      e.preventDefault();
      window.location.hash = '#editor';
    });
  }
  window.addEventListener('hashchange', handleHashChange);
  handleHashChange();

  // Existing initialization
  initializeAreaText();

  // Existing hover effects
  var toggleWrapper = document.querySelector('.segmented-toggle-wrapper');
  var outputBox = document.querySelector('.output-text-box');
  if (toggleWrapper && outputBox) {
    toggleWrapper.addEventListener('mouseenter', function() {
      outputBox.classList.add('text-mode-hover');
    });
    toggleWrapper.addEventListener('mouseleave', function() {
      outputBox.classList.remove('text-mode-hover');
    });
  }

  // Typography Adjustments hover effect
  var typographyHeader = document.querySelector('.typography-adjustments-box');
  var fontAndSliderArea = document.querySelector('.font-and-slider-area');
  if (typographyHeader && fontAndSliderArea) {
    // List of controls to trigger the hover effect
    var controls = [
      '#font-name-button',
      '#font-dropdown-menu',
      '#font-size-input',
      '#font-size-up',
      '#font-size-down',
      '#font-upload-button',
      '#font-file-input',
      '#font-weight-slider',
      '#line-height-slider',
      '#line-packing-slider',
      '#tracking-slider'
    ];
    controls.forEach(function(sel) {
      var el = document.querySelector(sel);
      if (el) {
        el.addEventListener('mouseenter', function() {
          typographyHeader.classList.add('typography-hover');
        });
        el.addEventListener('mouseleave', function() {
          typographyHeader.classList.remove('typography-hover');
        });
      }
    });
  }

  // Shape Adjustments hover effect
  var shapeHeader = document.querySelector('.shape-adjustments-box');
  var scaleSlider = document.getElementById('scale-slider');
  var rotationSlider = document.getElementById('rotation-slider');
  if (shapeHeader) {
    [scaleSlider, rotationSlider].forEach(function(el) {
      if (el) {
        el.addEventListener('mouseenter', function() {
          shapeHeader.classList.add('shape-hover');
        });
        el.addEventListener('mouseleave', function() {
          shapeHeader.classList.remove('shape-hover');
        });
      }
    });
  }

  // Motion Adjustments hover effect
  var motionHeader = document.querySelector('.motion-adjustments-box');
  if (motionHeader) {
    var motionControls = [
      '.motion-toggle-option',
      '.motion-toggle-slider',
      '#speed-slider',
      '.speed-label',
      '#amount-slider',
      '.amount-label',
      '.mode-option',
      '.mode-label'
    ];
    motionControls.forEach(function(sel) {
      var els = document.querySelectorAll(sel);
      els.forEach(function(el) {
        el.addEventListener('mouseenter', function() {
          motionHeader.classList.add('motion-hover');
        });
        el.addEventListener('mouseleave', function() {
          motionHeader.classList.remove('motion-hover');
        });
      });
    });
  }
});
