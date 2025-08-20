const {ensureNode} = require('./js/start');

test('ensureNode akzeptiert aktuelle Version', async () => {
  await expect(ensureNode('20.0.0')).resolves.toBeUndefined();
});

test('ensureNode lehnt alte Version ab', async () => {
  await expect(ensureNode('16.0.0')).rejects.toThrow('Node >=18 erforderlich');
});
