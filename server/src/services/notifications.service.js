import { query } from '../config/db.js';

const entityLabels = {
  announcement: ['announcement', 'New announcement'],
  event: ['event', 'New event'],
  food: ['food', 'Food menu updated'],
  lost_found: ['lost_found', 'New lost & found item'],
  deadline: ['deadline', 'New deadline'],
  mentor_group: ['mentor_group', 'New mentor group'],
};

export const createNotificationsForChange = async (entity, record) => {
  const label = entityLabels[entity];
  if (!label || !record?.id) return;

  let audience = 'SELECT id FROM users WHERE is_active = TRUE';
  const params = [];

  if (entity === 'announcement' && record.scope === 'academic_track' && record.target_track) {
    params.push(record.target_track);
    audience += ` AND academic_track = $${params.length}`;
  } else if (entity === 'announcement' && record.scope === 'mentor_group' && record.target_mentor_group_id) {
    params.push(record.target_mentor_group_id);
    audience += ` AND mentor_group_id = $${params.length}`;
  } else if (entity === 'event' && record.scope === 'academic' && record.target_track) {
    params.push(record.target_track);
    audience += ` AND academic_track = $${params.length}`;
  } else if (entity === 'event' && record.scope === 'mentor_group' && record.target_mentor_group_id) {
    params.push(record.target_mentor_group_id);
    audience += ` AND mentor_group_id = $${params.length}`;
  } else if (entity === 'deadline' && record.type === 'personal' && record.owner_id) {
    params.push(record.owner_id);
    audience += ` AND id = $${params.length}`;
  } else if (entity === 'deadline' && record.track) {
    params.push(record.track);
    audience += ` AND academic_track = $${params.length}`;
  }

  const title = record.title || record.item_name || label[1];
  const body = record.body || record.description || 'A new update is available in B- Lunder.';
  params.push(label[0], title, body, entity, record.id);
  const offset = params.length - 5;

  await query(
    `INSERT INTO notifications (user_id, type, title, body, entity_type, entity_id)
     SELECT id, $${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}
     FROM (${audience}) recipients`,
    params
  );
};
