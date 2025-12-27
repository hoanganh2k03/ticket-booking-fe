import { getStadiumSections, updateSectionMapPosition } from '/js/services/admin/stadiumService.js';
import { getToken } from '/js/utils/handleToken.js';

console.log('edit_stadium_layout.js loaded');

let stage, layer, transformer;
let stadiumId = null;
let stadiumConfig = {
  stage: { width: 1000, height: 700 },
  pitch: { x: 300, y: 200, width: 400, height: 300 },
  areas: []
};

async function init() {
  const urlParams = new URLSearchParams(window.location.search);
  stadiumId = urlParams.get('stadiumId');

  if (!stadiumId) {
    alert('Không tìm thấy ID sân vận động.');
    return;
  }

  const token = getToken();
  if (!token) {
    alert('Bạn chưa đăng nhập.');
    window.location.href = '/pages/login_empl.html';
    return;
  }

  try {
    const sections = await getStadiumSections(stadiumId, token);
    console.log('Fetched sections:', sections);
    stadiumConfig.areas = sections.map(section => {
      if (section.map_position) {
        try {
          const [rawType, shapeType, x, y, width, height] = section.map_position.split(',').map(s => s.trim());
          // normalize parsed type and fall back to section_name when missing
          const type = rawType ? rawType.toLowerCase() : (section.section_name && section.section_name.toLowerCase().includes('vip') ? 'vip' : 'stand');
          return { id: section.section_name, type, shapeType, x: parseFloat(x), y: parseFloat(y), width: parseFloat(width), height: parseFloat(height), section_id: section.section_id };
        } catch (e) {
          console.warn(`Lỗi định dạng map_position cho section ${section.section_name}: ${section.map_position}. Sử dụng vị trí mặc định.`, e);
          const defaultType = section.section_name && section.section_name.toLowerCase().includes('vip') ? 'vip' : 'stand';
          return { id: section.section_name, type: defaultType, shapeType: 'rect', x: Math.random() * 800, y: Math.random() * 600, width: 120, height: 60, section_id: section.section_id };
        }
      } else {
        // when map_position is null, type depends on section_name (case-insensitive match for 'vip')
        const type = section.section_name && section.section_name.toLowerCase().includes('vip') ? 'vip' : 'stand';
        return { id: section.section_name, type, shapeType: 'rect', x: Math.random() * 800, y: Math.random() * 600, width: 120, height: 60, section_id: section.section_id };
      }
    });
    console.log('Mapped stadiumConfig.areas:', stadiumConfig.areas);

    initStage();
    drawPitch();

    if (stadiumConfig.areas.length === 0) {
      // show friendly message so user knows why nothing is shown
      const container = document.getElementById('container');
      container.innerHTML = '<div style="padding:20px;color:#666">Không có khu vực nào (hoặc không thể tải khu vực). Vui lòng kiểm tra lại danh sách khu vực trong trang quản lý sân.</div>' + container.innerHTML;
      console.warn('No sections returned from API or token invalid/expired');
      return;
    }

    drawSections();
    layer.draw();

  } catch (error) {
    console.error('Lỗi khi tải dữ liệu khu vực sân:', error);
    alert('Không thể tải dữ liệu khu vực sân.');
  }
}

function initStage() {
  stage = new Konva.Stage({
    container: 'container',
    width: stadiumConfig.stage.width,
    height: stadiumConfig.stage.height
  });

  layer = new Konva.Layer();
  stage.add(layer);

  transformer = new Konva.Transformer({
    rotateEnabled: false
  });
  layer.add(transformer);

  stage.on('click', e => {
    if (e.target === stage) {
      transformer.nodes([]);
    }
  });
}

function drawPitch() {
  layer.add(new Konva.Rect({
    ...stadiumConfig.pitch,
    fill: '#2ecc71',
    stroke: 'black',
    strokeWidth: 2,
    listening: false
  }));
}

function createSection({ id, x, y, width, height, type, section_id }) {
  const group = new Konva.Group({
    x, y,
    draggable: true,
    name: 'section',
    id: String(section_id) // Store section_id in Konva group
  });

  const rect = new Konva.Rect({
    width, height,
    fill: type === 'vip' ? '#f1c40f' : '#3498db',
    stroke: 'black',
    strokeWidth: 2
  });

  const text = new Konva.Text({
    text: id,
    width, height,
    align: 'center',
    verticalAlign: 'middle',
    fill: 'white',
    fontSize: 16
  });

  group.add(rect);
  group.add(text);
  layer.add(group);

  // Ensure text is visually centered inside the rect
  text.position({ x: width / 2, y: height / 2 });
  text.offsetX(text.width() / 2);
  text.offsetY(text.height() / 2);

  console.log(`Created section ${id} at (${x},${y}) size ${width}x${height} type ${type} section_id ${section_id}`);

  group.on('click', e => {
    e.cancelBubble = true;
    transformer.nodes([rect]);
  });

  rect.on('transformend', () => {
    // update size and re-center text
    rect.width(rect.width() * rect.scaleX());
    rect.height(rect.height() * rect.scaleY());
    rect.scale({ x:1, y:1 });
    text.width(rect.width());
    text.height(rect.height());
    text.position({ x: rect.width() / 2, y: rect.height() / 2 });
    text.offsetX(text.width() / 2);
    text.offsetY(text.height() / 2);
  });
}

function drawSections() {
  stadiumConfig.areas.forEach(a => createSection(a));
}

function exportJSON() {
  const areas = [];

  layer.find('.section').forEach(g => {
    const rect = g.findOne('Rect');
    const text = g.findOne('Text');

    areas.push({
      section_id: parseInt(g.id()),
      id: text.text(),
      x: Math.round(g.x()),
      y: Math.round(g.y()),
      width: Math.round(rect.width()),
      height: Math.round(rect.height()),
      type: rect.fill() === '#f1c40f' ? 'vip' : 'stand'
    });
  });

  const result = {
    stage: stadiumConfig.stage,
    pitch: stadiumConfig.pitch,
    areas
  };

  document.getElementById('output').textContent = JSON.stringify(result, null, 2);
}

async function saveLayout() {
  const token = getToken();
  if (!token) {
    alert('Bạn chưa đăng nhập.');
    window.location.href = '/pages/login_empl.html';
    return;
  }

  const updates = [];
  layer.find('.section').forEach(g => {
    const rect = g.findOne('Rect');
    const text = g.findOne('Text');

    const map_position = `\n      ${rect.fill() === '#f1c40f' ? 'vip' : 'stand'},rect,` + 
                         `${Math.round(g.x())},${Math.round(g.y())},` + 
                         `${Math.round(rect.width())},${Math.round(rect.height())}`;

    updates.push({
      section_id: parseInt(g.id()),
      map_position: map_position.trim()
    });
  });

  try {
    for (const update of updates) {
      // call service with stadiumId and sectionId
      console.log(`Updating section ${update.section_id} -> ${update.map_position}`);
      const res = await updateSectionMapPosition(stadiumId, update.section_id, update.map_position);
      console.log('Update response:', res);
    }
    alert('Lưu layout thành công!');
  } catch (error) {
    console.error('Lỗi khi lưu layout:', error);
    alert('Lưu layout thất bại.');
  }
}

// Expose functions to global scope so inline onclick in HTML can call them
window.saveLayout = saveLayout;
window.exportJSON = exportJSON;
window.goBackToStadiums = function() { window.location.href = '/pages/admin/base.html#events/stadiums'; };

init();