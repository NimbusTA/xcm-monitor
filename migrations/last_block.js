exports.up = pgm => {
    pgm.createTable('last_block', {
        block: { type: 'integer' },
    }, { ifNotExists: true })
};
