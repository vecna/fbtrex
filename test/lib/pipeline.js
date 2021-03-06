const expect    = require("chai").expect;
const nconf = require('nconf');
const moment = require('moment');
const _ = require('lodash');
const debug = require('debug')('test:lib:pipeline');

const mongo = require('../../lib/mongo');
const pipeline = require('../../lib/pipeline');

nconf.argv().env().file({ file: 'config/content.json' });

describe('test the pipeline functions', function() {

    const mongoHost = nconf.get('mongoHost');
    const mongoPort = nconf.get('mongoPort');
    const mongoDb = 'test'; // normally is 'facebook';

    const mongoUri = `mongodb://${mongoHost}:${mongoPort}/${mongoDb}`;
    const testC = 'pipeline';

    it('countByDay', async function() {

        const mongoc = await mongo.clientConnect({uri: mongoUri});
        await mongo.deleteMany(mongoc, testC, { what: 'countable' });
        const AMOUNT = 200;

        const d = _.times(AMOUNT, function(i) {
            let w = moment({ year: 2019, month: 0, day: 1 }).add(i, 'hours').add(1, 'minute');
            return {
                when: new Date(w.toISOString()),
                value: i,
                mod: i % 3,
                what: 'countable'
            }
        });

        const written = await mongo.insertMany(mongoc, testC, d);
        expect(written.result.n).to.be.equal(AMOUNT);
        await mongoc.close();

        const counted1 = await pipeline.countByDay(testC, '$when', { what: 'countable', mod: 1 }, {});
        expect(counted1).to.have.lengthOf(9);

        const counted2 = await pipeline.countByDay(testC, '$when', { what: 'countable' }, {});
        expect(counted2[0].count).to.be.above(counted1[0].count);
    });

    it('countByFeature', async function() {

        const size = _.random(20, 40);
        const mongoc = await mongo.clientConnect({uri: mongoUri});
        await mongo.deleteMany(mongoc, testC, { what: 'byfeat' });

        const d = _.times(size, function(i) {
            return {
                value: i,
                mod: i % 3,
                what: 'byfeat'
            }
        });

        const written = await mongo.insertMany(mongoc, testC, d);
        expect(written.result.n).to.be.equal(size);
        await mongoc.close();

        const counted1 = await pipeline.countByFeature(testC, { what: 'byfeat' }, "$mod");
    });
});
