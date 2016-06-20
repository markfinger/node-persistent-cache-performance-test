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

kv-cache is much more performant for writes (averaging 20% of the time taken by sqlite).
However, kv-cache hits OS limits on file accesses fairly quickly, as a couple of thousand
open files will trigger errors (at least on OSX).

Read performance is a bit more unpredictable. Sometimes sqlite is faster
(averaging 30-60% of the time taken by kv-cache). Sometimes they're even, I suspect at this
point the OS is probably optimising FS caches and we're not actually hitting the disk anymore.

In general, the benchmarking proved to be quite inconsistent. Multiple runs would show different
performance times. My suspicion is the OS optimising as we're hammering the FS.

Assuming sqlite's blocking writes (which are the cause of write slowdown) aren't an issue for
your project, I'd probably recommend it. kv-cache's issues with file limits is a bit of a blocker
for larger projects.