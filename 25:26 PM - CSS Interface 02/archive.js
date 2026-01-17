// Archive top bar text swap and interaction logic
window.handleArchiveTopbar = function(isArchive) {
  var topLeft = document.querySelector('.top-left p');
  if (!topLeft) return;
  if (isArchive) {
    topLeft.textContent = 'Go back to Editor/Tool';
    topLeft.classList.add('archive-topbar-link');
    topLeft.style.cursor = 'pointer';
    topLeft.onclick = function(e) {
      e.preventDefault();
      window.location.hash = '#editor';
    };
  } else {
    topLeft.textContent = 'Typeflow-T-Area is an area-based typesetting Tool. Where language takes shape and text becomes form.';
    topLeft.classList.remove('archive-topbar-link');
    topLeft.style.cursor = '';
    topLeft.onclick = null;
  }
};
// Archive gallery rendering for Archive view
function renderArchive() {
  var grid = document.getElementById('archiveGrid');
  if (!grid) return;
  grid.innerHTML = '';
  let items = [];
  try {
    items = JSON.parse(localStorage.getItem('typeflow_archive_items')) || [];
  } catch (e) { items = []; }
  if (!items.length) {
    var empty = document.createElement('div');
    empty.textContent = 'No archived works yet.';
    empty.style.margin = '32px 0';
    empty.style.textAlign = 'center';
    grid.appendChild(empty);
    return;
  }
  items.forEach(function(item, idx) {
    var wrap = document.createElement('div');
    wrap.style.display = 'flex';
    wrap.style.flexDirection = 'column';
    wrap.style.alignItems = 'center';
    wrap.style.marginBottom = '18px';
    var img = document.createElement('img');
    img.src = item.dataUrl;
    img.style.maxWidth = '100%';
    img.style.maxHeight = '120px';
    img.style.border = '1px solid #ccc';
    img.style.background = '#fff';
    img.style.marginBottom = '4px';
    var ts = document.createElement('div');
    try {
      var d = new Date(item.createdAt);
      ts.textContent = d.toLocaleString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', '');
    } catch (e) {
      ts.textContent = item.createdAt;
    }
    ts.style.fontSize = '11px';
    ts.style.color = '#666';
    ts.style.textAlign = 'center';
    // Delete link
    var del = document.createElement('a');
    del.textContent = 'Delete';
    del.href = '#';
    del.className = 'archive-delete-link';
    del.onclick = function(e) {
      e.preventDefault();
      if (confirm('Delete this archived item?')) {
        // Remove item and update storage
        let arr = [];
        try {
          arr = JSON.parse(localStorage.getItem('typeflow_archive_items')) || [];
        } catch (e) { arr = []; }
        arr = arr.filter(x => x.id !== item.id);
        localStorage.setItem('typeflow_archive_items', JSON.stringify(arr));
        renderArchive();
      }
    };
    del.style.margin = '6px 0 0 0';
    del.style.fontSize = '11px';
    del.style.color = '#c00';
    del.style.cursor = 'pointer';
    wrap.appendChild(img);
    wrap.appendChild(ts);
    wrap.appendChild(del);
    grid.appendChild(wrap);
  });
}
