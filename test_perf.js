const path = require('path');
const fs = require('fs');
const rimraf = require('rimraf');
const kvCache = require('kv-cache');
const sqlite3 = require('sqlite3');

const toWrite = `
The standard Lorem Ipsum passage, used since the 1500s

"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."

Section 1.10.32 of "de Finibus Bonorum et Malorum", written by Cicero in 45 BC

"Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?"

1914 translation by H. Rackham

"But I must explain to you how all this mistaken idea of denouncing pleasure and praising pain was born and I will give you a complete account of the system, and expound the actual teachings of the great explorer of the truth, the master-builder of human happiness. No one rejects, dislikes, or avoids pleasure itself, because it is pleasure, but because those who do not know how to pursue pleasure rationally encounter consequences that are extremely painful. Nor again is there anyone who loves or pursues or desires to obtain pain of itself, because it is pain, but because occasionally circumstances occur in which toil and pain can procure him some great pleasure. To take a trivial example, which of us ever undertakes laborious physical exercise, except to obtain some advantage from it? But who has any right to find fault with a man who chooses to enjoy a pleasure that has no annoying consequences, or one who avoids a pain that produces no resultant pleasure?"

Section 1.10.33 of "de Finibus Bonorum et Malorum", written by Cicero in 45 BC

"At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident, similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga. Et harum quidem rerum facilis est et expedita distinctio. Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus, omnis voluptas assumenda est, omnis dolor repellendus. Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae. Itaque earum rerum hic tenetur a sapiente delectus, ut aut reiciendis voluptatibus maiores alias consequatur aut perferendis doloribus asperiores repellat."

1914 translation by H. Rackham

"On the other hand, we denounce with righteous indignation and dislike men who are so beguiled and demoralized by the charms of pleasure of the moment, so blinded by desire, that they cannot foresee the pain and trouble that are bound to ensue; and equal blame belongs to those who fail in their duty through weakness of will, which is the same as saying through shrinking from toil and pain. These cases are perfectly simple and easy to distinguish. In a free hour, when our power of choice is untrammelled and when nothing prevents our being able to do what we like best, every pleasure is to be welcomed and every pain avoided. But in certain circumstances and owing to the claims of duty or the obligations of business it will frequently occur that pleasures have to be repudiated and annoyances accepted. The wise man therefore always holds in these matters to this principle of selection: he rejects pleasures to secure other greater pleasures, or else he endures pains to avoid worse pains."
`;

process.on('unhandledRejection', err => {
  throw err;
});

const tests = [100, 300, 500, 800, 1000, 5000, 8000];
const scores = {};
tests.forEach(count => {
  scores[count] = [];
});

let block = Promise.resolve(null);

const writeDir = path.join(__dirname, 'write_test');
tests.forEach(count => {
  block = block.then(() => {
    // console.log(`Starting kv-cache (fs) ${count} test`);
    rimraf.sync(writeDir);
    const start = (new Date()).getTime();
    const cache = kvCache.createFileCache(writeDir);

    const writes = [];
    for (var i=0; i<count; i++) {
      writes.push(cache.set(i, toWrite));
    }

    return Promise.all(writes)
      .then(() => {
        const duration = (new Date()).getTime() - start;
        scores[count].push(duration);
      });
  });
});

block = block.then(() => rimraf.sync(writeDir));

const dbFile = path.join(__dirname, 'write_test.db');
tests.forEach(count => {
  block = block.then(() => {
    // console.log(`Starting sqlite ${count} write test`);
    if (fs.existsSync(dbFile)) {
      fs.unlinkSync(dbFile);
    }
    const start = (new Date()).getTime();

    return new Promise((res, rej) => {
      var db = new sqlite3.Database(dbFile);
      db.run(`CREATE TABLE CACHE(
        key  CHAR(50)  PRIMARY KEY  NOT NULL,
        value  TEXT
      );`, (err) => {
        if (err) return rej(err);

        const sql = [];
        const params = [];
        for (var i=0; i<count; i++) {
          sql.push(`INSERT INTO CACHE (key, value) VALUES ("${i}", '${JSON.stringify(toWrite)}');`);
        }

        db.run(sql.join('\n'), params, (err) => {
          if (err) return rej(err);

          const duration = (new Date()).getTime() - start;
          scores[count].push(duration);
          res();
        });
      });
    });
  });
});

tests.forEach(count => {
  block = block.then(() => {
    // console.log(`Starting kv-cache (fs) ${count} test`);
    rimraf.sync(writeDir);
    const writeCache = kvCache.createFileCache(writeDir);
    const writes = [];
    for (var i=0; i<count; i++) {
      writes.push(writeCache.set(i, toWrite));
    }

    return Promise.all(writes)
      .then(() => {
        const start = (new Date()).getTime();
        const readCache = kvCache.createFileCache(writeDir);
        const reads = [];
        for (var i=0; i<count; i++) {
          reads.push(readCache.get(i, toWrite));
        }

        return Promise.all(reads)
          .then(() => {
            const duration = (new Date()).getTime() - start;
            scores[count].push(duration);
          });
      });
  });
});

block = block.then(() => rimraf.sync(writeDir));

tests.forEach(count => {
  block = block.then(() => {
    // console.log(`Starting sqlite ${count} write test`);
    if (fs.existsSync(dbFile)) {
      fs.unlinkSync(dbFile);
    }

    return new Promise((res, rej) => {
      var writeDb = new sqlite3.Database(dbFile);
      writeDb.run(`CREATE TABLE CACHE(
        key  CHAR(50)  PRIMARY KEY  NOT NULL,
        value  TEXT
      );`, (err) => {
        if (err) return rej(err);

        const writes = [];
        for (var i=0; i<count; i++) {
          (() => {
            let _i = i;
            writes.push(new Promise((res, rej) => {
              writeDb.run(`INSERT INTO CACHE (key, value) VALUES (?, ?);`, [_i, toWrite], (err) => {
                if (err) return rej(err);
                res();
              });
            }));
          })();
        }

        Promise.all(writes)
          .then(() => {
            const start = (new Date()).getTime();
            var readDb = new sqlite3.Database(dbFile);

            const reads = [];
            for (var i=0; i<count; i++) {
              (() => {
                let _i = i;
                reads.push(new Promise((res, rej) => {
                  readDb.get(`SELECT value from CACHE where key = ?;`, [_i], (err) => {
                    if (err) return rej(err);
                    res();
                  });
                }));
              })();
            }

            Promise.all(reads)
              .then(() => {
                const duration = (new Date()).getTime() - start;
                scores[count].push(duration);
                res();
              });
          });
      });
    });
  });
});

block.then(() => {
  console.log('record count: kv-cache write, sqlite write, kv-cache read, sqlite read]');
  for (var x in scores) {
    console.log(x, scores[x]);
  }
});