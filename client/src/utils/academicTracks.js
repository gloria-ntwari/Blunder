export const ACADEMIC_TRACKS = ['IB', 'MINT', 'Abitur'];

export const TRACK_CLASSES = {
  IB: [
    { value: 'DP2', label: 'DP2' },
    { value: 'DP1', label: 'DP1' },
    { value: 'MYP5', label: 'MYP5' },
    { value: 'MYP4', label: 'MYP4' },
    { value: 'MYP3', label: 'MYP3' },
  ],
  MINT: [
    { value: 'Klasse 5', label: 'Klasse 5 – Year 5' },
    { value: 'Klasse 6', label: 'Klasse 6 – Year 6' },
    { value: 'Klasse 7', label: 'Klasse 7 – Year 7' },
    { value: 'Klasse 8', label: 'Klasse 8 – Year 8' },
    { value: 'Klasse 9', label: 'Klasse 9 – Year 9' },
    { value: 'Klasse 10', label: 'Klasse 10 – Year 10' },
    { value: 'EF', label: 'Einführungsphase (EF) – Year 10' },
    { value: 'Q1', label: 'Qualifikationsphase Q1 – Year 11' },
    { value: 'Q2', label: 'Qualifikationsphase Q2 – Year 12' },
  ],
  Abitur: [
    { value: 'Klasse 5', label: 'Klasse 5 – Year 5' },
    { value: 'Klasse 6', label: 'Klasse 6 – Year 6' },
    { value: 'Klasse 7', label: 'Klasse 7 – Year 7' },
    { value: 'Klasse 8', label: 'Klasse 8 – Year 8' },
    { value: 'Klasse 9', label: 'Klasse 9 – Year 9' },
    { value: 'Klasse 10', label: 'Klasse 10 – Year 10' },
    { value: 'EF', label: 'Einführungsphase (EF) – Year 10' },
    { value: 'Q1', label: 'Qualifikationsphase Q1 – Year 11' },
    { value: 'Q2', label: 'Qualifikationsphase Q2 – Year 12' },
  ],
};

export const getClassesForTrack = (track) => {
  return TRACK_CLASSES[track] || TRACK_CLASSES['IB'];
};
