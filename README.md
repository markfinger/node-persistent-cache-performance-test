node-persistent-cache-test
==========================

Testing performance characteristics of [kv-cache](https://github.com/markfinger/kv-cache)
and [sqlite3](https://github.com/mapbox/node-sqlite3), two persistent file stores
for node that I am evaluating for the purposes of storing persistent cached date.

Functionality needs include the ability to read/write anywhere from a few dozen to a few
thousand records.


Background
----------

- kv-cache uses a sparse FS structure where keys are mapped to individual files stored in
  a single directory
- sqlite3 uses a single file.


Conclusions
-----------

kv-cache is much more performant for lots of asynchronous writes (averaging 20-50% of the time
taken by sqlite). However, kv-cache hits OS limits on file accesses fairly quickly, as a couple
of thousand open files will trigger errors (at least on OSX). sqlite can be made much more
performant for writes if you merge all the `INSERT` statements into a single SQL string. At that
point, sqlite tends to outperform kv-cache by 30-50%.


Read performance is a bit more unpredictable. Sometimes sqlite is faster (averaging 30-60% of
the time taken by kv-cache). Sometimes they're even, I suspect at this point the OS is probably
optimising FS caches and we're not actually hitting the disk anymore. I haven't investigated merging
sqlite reads into a single statement, but it has the potential to improve perf.

In general, the benchmarking indicated that sqlite can be much faster if you batch statements, but
asynchronous single statements are inconsistent in the performance differences (most likely down to
OS optimisations of the FS).