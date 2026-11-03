## [5.0.3](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v5.0.2...v5.0.3) (2026-11-03)

### Bug Fixes

- **function:** look up a create key by its column values when a relation shares them ([c8c05e5](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/c8c05e53625dfa61189c44f01ef41290303112a3))

## [5.0.2](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v5.0.1...v5.0.2) (2026-11-03)

### Bug Fixes

- **authorization:** fail closed on iam resource variables without a loaded resource ([ce83cd6](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/ce83cd674af3f6eede90b1cd42d3809917525b2d))
- **authorization:** refuse updates that move a row out of its scope ([aaaae30](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/aaaae30c36a99528777609dc4e6f70ee5f3bf3ad))

## [5.0.1](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v5.0.0...v5.0.1) (2026-11-03)

### Bug Fixes

- **route:** accept a described uuid, integer or string as an iam placeholder ([aae2d92](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/aae2d92931fb9bb05e0b365c9fc258a7434f9061))
- **route:** refuse a body or query uuid that is not lower-case ([3b99100](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/3b991004a82b02b71558c4e7f4e1762d59783876))

# [5.0.0](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v4.7.0...v5.0.0) (2026-11-03)

### Bug Fixes

- **api:** name the request dtos of inherited custom routes after the decorated controller ([e2e2692](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/e2e2692754997182bd026a1bee442dce00f0d286))
- **api:** serve routes of controller subclasses with the decorated prefix ([84af84c](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/84af84ca5f1a7c01439c6df6e7eaf6ed73b08337))
- **api:** validate custom routes of securable controllers on the original class ([5d4c5d4](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/5d4c5d4ed9f70a1e7256fbed269eaa41142c7552))
- **authorization:** answer 409 when a create loses a concurrency race ([0cb925e](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/0cb925e3a41321bbea8a70141f6d079d4c52e013))
- **authorization:** bind a custom repository without running its constructor ([92e9abc](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/92e9abcdae4c9efcbadb3e1e7431024fd013bede))
- **authorization:** bind scoped create to the full key and transaction ([8eac96d](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/8eac96d72ecd8c837dd0de5031d5aa3137791485))
- **authorization:** bind temporal create keys by their column type ([05a95ed](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/05a95edc9f6cef2cbee3fab1bfb26c66e1f86490))
- **authorization:** bind temporal create keys through the shared instant helper ([4ee4486](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/4ee4486d3fd84e079b3b07c7a0adf74e165d3a2c))
- **authorization:** compile iam resource deny statements into row exclusions ([9fbfd6e](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/9fbfd6ef49ad95f8da23f538c920b42d17ca786b))
- **authorization:** count the rows a create key matches before and after the reload ([f80bb1f](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/f80bb1fab0c6cc3368a3e7b8aa541184f89406b0))
- **authorization:** fail iam resource paths through to-many relations closed ([ef3752c](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/ef3752c870b094f2a38071ff2be8c5ea6ce8ea10))
- **authorization:** find a create key inside an embedded property by its property path ([b63c118](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/b63c118208335f24f752b11c2cc4d4e687d17f42))
- **authorization:** identify the created row by its stored key ([59c029e](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/59c029e17594320f5582f91a0bac50487d033346))
- **authorization:** join the create again after a hop without a transaction ([27c99b4](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/27c99b4cbcba776c41f08c17cd31c2f6a54f1b73))
- **authorization:** keep a custom repository inside the create transaction ([4197580](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/41975804a991381a31b7e1ebcf423ea2fa5a1d02))
- **authorization:** keep bound operands and name the scope path without a predicate ([d8612fa](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/d8612fa6ba4bf3f40037ad821848f18267a3f08e))
- **authorization:** let startup checks wait for a data source that starts later ([1dea963](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/1dea96327817272eb7e9efb2ee71753c0c9fcd02))
- **authorization:** let the guard resolve without the rule registry and fail closed ([b9ae64f](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/b9ae64f49dba7f3d969f065e073ac24c5880e694))
- **authorization:** parse temporal create keys once and refuse what a column cannot store ([4264236](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/42642365ffc756b78b8a1044804cef941c32f86c))
- **authorization:** read iam resource paths by one rule in the scope and in memory ([ffdad0f](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/ffdad0fa2db624b79b2f4b23c1c3ad886703a867))
- **authorization:** refuse a securable controller in an application without the module ([e44255b](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/e44255b3fa8d215a5f63053cb98908e85f76ef53))
- **authorization:** refuse a securable create key finer than a millisecond ([ad6c97b](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/ad6c97b98cf53509508c2a9f7bbd3178bcdaa50f))
- **authorization:** refuse a served route that skips authorization on a securable controller ([115822e](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/115822eabd9d8f4bded0f67ae017b18ee2dcb6cf))
- **authorization:** refuse and deny a transport that has no trusted identity ([352a8b9](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/352a8b92682f81b8954a17ea1d6334b692b60b11))
- **authorization:** refuse and deny every handler that skips authorization ([08eee3f](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/08eee3f1ee637197fb166ef4ecc6ed175704bd1d))
- **authorization:** refuse only the generated create routes that can never succeed ([2577d91](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/2577d9173fd0500a74d39987f564a3a4c1dc0f7c))
- **authorization:** refuse out-of-scope create rows with a rollback ([7908bce](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/7908bce1e79a9a966f62785a1c4ee410e44ee05c))
- **authorization:** run create error subscribers after the rollback ([cb9a3cb](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/cb9a3cb2d3c308766be649e60c3f29dd518b8bb9))
- **authorization:** run every generated create in one transaction ([98cb743](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/98cb743180a17edfbefecdbb0695b404ae0d0f9e))
- **authorization:** support temporal create keys only on drivers that pass the matrix ([c83f764](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/c83f764cf01c5367ac10575bf9a8625cf7e8e4c4))
- **controller:** bind composed conditions on transformed temporal columns ([9e8b76c](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/9e8b76c00c2e8a86f1c582ddfb64cc7131255e20))
- **controller:** bind dates inside composed operators on instant columns ([be462c7](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/be462c7c7a15a735aee057b9230cc0cfe7c443bf))
- **controller:** bind the dates transformers return as utc text ([89f6811](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/89f68118c247316d68dbd96598e8eb789bb0b1c2))
- **controller:** check an already merged scope in linear comparisons ([1c1f844](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/1c1f8441e4ff5e8094df941618dbdef9b347bf3e))
- **controller:** check cursor routes against the active database at bootstrap ([b657e4b](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/b657e4b448dd0b47e645629859b51102f42d0e3f))
- **controller:** check the functions of a generated create against the transaction it holds ([082bf58](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/082bf58c08daa7c8e7e96e05da208869baa0f4a7))
- **controller:** fail closed on postgres relation loads that bind temporal keys ([fbef174](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/fbef1741bacf6600096507c5ba28c59306245c79))
- **controller:** fail startup on an invalid relations.request config ([70c024b](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/70c024bcfd0f86949523f7dced9e8b95ad14a584))
- **controller:** find table inheritance children for the to-many update guard without a read plan ([365b4f6](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/365b4f6395652682c4ca3b1e99a115c5970d6cb2))
- **controller:** hydrate to-many request references as arrays and reject them on updates ([a855072](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/a8550725175060c5279dbe0994a58771eb8724b7))
- **controller:** keep driver parameter typing on bound conditions ([20065ce](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/20065ceb37276a9b56b599d261369b187722c480))
- **controller:** keep startup checks unskippable and name every repository failure ([7b0802e](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/7b0802e0c5dd3dc3dc173e7c2964f991868bbb34))
- **controller:** keep temporal keys and filters exact on joined postgres reads ([bdb3990](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/bdb39900db603ded4621573bd8ef71c19ec07715))
- **controller:** keep undeclared custom list envelopes unless the entity owns items ([ecde336](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/ecde336610bd6e85c49025d546acd43e5f98278f))
- **controller:** let a host filter translate a refused create key ([ef389e0](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/ef389e0c7640e08ab6ca6610b240cf3355a0e303))
- **controller:** make temporal cursor boundaries exact in every process time zone ([2cbc9e0](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/2cbc9e0a41e47662be7ee85bf54a34d40bebca54))
- **controller:** name what an unrecognized service repository lacks ([9332ad6](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/9332ad6ff0ae29df1225d53eeca7da998cb95103))
- **controller:** page and guard cockroachdb reads over temporal keys ([415a2a5](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/415a2a57d91891542cc99dba497f933d72b35d95))
- **controller:** project to-many response relations element by element ([3208076](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/320807651440f67fc574992d7b0dd515ee820063))
- **controller:** read entity columns through the mapped class chain ([61e3546](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/61e35467a4e2500c70a949d2bb59208d457e0295))
- **controller:** read only whole iso 8601 text as a calendar date ([7c2a838](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/7c2a83821a2404e99b93ecb219d409779337912a))
- **controller:** read the discriminator column as typeorm does and tighten variant rules ([f9230c4](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/f9230c46aa23af8e29177d66a0a3b95a3c7c7a48))
- **controller:** read the response items envelope from the route type only ([804f699](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/804f699f632dfdcfb8924457401b7c1e4a870142))
- **controller:** rebuild cached to-many paths when an embedded column registers ([c27082a](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/c27082a8452d55ba6c3d381792e2b1a9565f300c))
- **controller:** rebuild cached to-many paths when more entity metadata registers ([ec13074](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/ec13074bb56bf887dd10af15e02a467b65f61c1f))
- **controller:** recognize typeorm repositories across copies and fail closed ([8380bdb](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/8380bdb568109e325814cfe917919ab7a72f29d7))
- **controller:** refuse a missing repository only with an enabled generated route ([59a2dfb](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/59a2dfb04c41b16020aa0af4558eef835e7ee657))
- **controller:** refuse at startup a route whose get function cannot read its response ([26608cb](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/26608cb3a6eb1b6c41224983af29d80c68233e7c))
- **controller:** refuse at startup a route whose write function cannot run in its mode ([254bbb8](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/254bbb89e4772cd2503c025ecdb4c64e9fda10c5))
- **controller:** refuse impossible calendar dates on a create key ([2a81c98](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/2a81c98191489f52b51c85af4eeb38d0dd54c488))
- **controller:** register no empty component per relation property ([153c545](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/153c5453c95807fb341ad119cd0af5cc3588c6d1))
- **controller:** reject every to-many key on updates before running the route ([9379d74](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/9379d74f2411b2a0180dd7da607a04c7802afaab))
- **controller:** reject filter date-times outside the calendar on every list route ([5fe878b](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/5fe878bef293ded358d14839dabd1fdc1cc0a7fe))
- **controller:** reject table inheritance setups that break polymorphic responses ([f471e5e](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/f471e5e5a4d2f2d22ce09077953e8b5e45730f8a))
- **controller:** reject to-many keys on custom update routes before hydration ([2060844](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/206084405a60dac26848173e72b0788a8037e96a))
- **controller:** reject zone-less filter values on instant columns ([e2515c9](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/e2515c957744f4225ae3294e69dede42ecafaad1))
- **controller:** stop serving a route disabled on a child controller ([e3f5b8f](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/e3f5b8f1c772588ae20e573f2baf47f985af777b))
- **controller:** tell a plain function override to move its logic out ([c6dea65](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/c6dea6593fae76d234961c9f1e7df51822cd6898))
- **controller:** treat mssql datetimeoffset columns as instants ([7fa2227](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/7fa222745d012cde07b5ca8c380c09b739eb92cb))
- **controller:** type the generated method names as the runtime names them ([00174f6](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/00174f6a1183286598f6fb2960ab49902ed4790b))
- **deps:** close peer dependency upper bounds ([fee3061](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/fee306110a6caea8aedec190a603593c66105e3b))
- **deps:** drop the type-only fastify peer ([62ffcc4](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/62ffcc4ff7254cf36cd8fa35ce58912e710ebd73))
- **deps:** drop unused peers and pin peer install ranges ([de36805](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/de36805ca82b2302ca6fe84353073a1d9279bf82))
- **deps:** stop importing private swagger paths ([e1160c3](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/e1160c364a17cf7e676a1f5f59346b3290810ba0))
- **dto:** answer the in operator on deferred order metadata ([50370bb](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/50370bb3f751fc9bfc48aa5e64ccf759e812ee70))
- **dto:** apply the free-form rule to a value with no type ([b9af52e](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/b9af52e51d366ee6349c2ee214703d0f83816e86))
- **dto:** bound date years and check date values as sent ([9c58325](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/9c583259ef8e59489f78ebbf9bcf27638e5a50af))
- **dto:** check schema names per application at bootstrap ([f272620](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/f272620e07c1ea61226939d23aea63c9fdee97c2))
- **dto:** check the array options of every property decorator at decoration ([e1ea1c1](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/e1ea1c1e3975f3716a14f0c41b3d684d52e5fa14))
- **dto:** check the id reference key and describe soft-deleted targets as null ([ccb65f0](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/ccb65f0d27d14077c48929add4c332e95d94af40))
- **dto:** check the name of every class in a generated route schema ([b634b8f](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/b634b8f278d6d30b2e7f047c875609a176ecfa5c))
- **dto:** describe exception bodies as they are on the wire ([3ae94c8](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/3ae94c8f897add51a186d76c25858eba93d859ea))
- **dto:** describe response relations as the route sends them ([b857cd0](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/b857cd0a6a29e6f1625509a919007daddbe7d79a))
- **dto:** describe when error is on the wire after the body shape change ([2730cc9](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/2730cc997ec442a4df22ddb99fff8f5af649ac2d))
- **dto:** drop the unused minimum filter properties constant ([9f3768d](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/9f3768d33796eebb9cf5fb35d6fed1739811b493))
- **dto:** enforce unique items on request arrays ([b8c2c84](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/b8c2c848a48da15ca2cd062360482b60d11e4633))
- **dto:** hold date request values to their published form ([6a6e77a](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/6a6e77a70b6686e5466f7027807ef662a2862bb6))
- **dto:** judge sent date values under their wire name in any order ([428039f](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/428039f46d8b3a42d17189d4b88cfb6fe0fd9bae))
- **dto:** keep an explicit expose whatever the decorator order ([039ad2d](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/039ad2d64ba55106c12a4c38fa2bdfbff5cebaac))
- **dto:** keep an omitted discriminator and refuse false on a request ([e9ddbfc](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/e9ddbfc493c7eee40bb68c396113fa98a5d2ec78))
- **dto:** keep the expose and exclude of a manual child in its generated copy ([e10fd4a](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/e10fd4aa6f608b4f136078cef66e395f0f13e62b))
- **dto:** keep the transforms and types of a manual child in its generated copy ([f8cdf76](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/f8cdf7662ae2da27450fa5ba384b7a61fae5a416))
- **dto:** key generated list queries by the list response class ([d602d11](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/d602d11418796dc1d75eb168966e241ce4430968))
- **dto:** let a response array of any property decorator leave its bounds out in the types ([361a4de](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/361a4dec13b727d19b331bc290e167ba2abba619))
- **dto:** let a response transform enumerate the full row in obj ([591cb75](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/591cb75296b3e05a77b715b5a223b4dee9418d1b))
- **dto:** mark the list and uuid transforms as automator transforms ([b5b7792](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/b5b7792a63dca56d3969a8b225f552c4d372d69a))
- **dto:** name every generated dto after its controller ([5a9384d](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/5a9384d5404ba7173574ab296b99a3d8a570213a))
- **dto:** name every nested generated dto after its parent dto ([985d39c](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/985d39ce0834f64cc230d376e9b7a2d368e8e040))
- **dto:** name the list wrappers so no property name can produce them ([8b8ae05](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/8b8ae05b4a5cae01683803bc9a52593a3c339ee0))
- **dto:** name the nested dtos of a property copy after the host dto ([62deffe](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/62deffec0a78065c46858814f2514fbb8ababaf0))
- **dto:** name the reference details type in the not valid form ([f82c93e](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/f82c93eb70926b8c5db7c3932ee96d8794037038))
- **dto:** pair rename map components only when it is safe ([99ac8e7](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/99ac8e79dc340f9f7262c0ebe6963da9149e11bd))
- **dto:** pin class-transformer to the release whose storage is read ([fd58e25](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/fd58e255be3e429276f73025a43d003aca7ba6f4))
- **dto:** publish the item type of string, uuid and date arrays ([79fd2ae](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/79fd2ae442db7f1f3d6538e34890cae574a5527d))
- **dto:** read a fractional step as an exact decimal ([bc477ae](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/bc477ae409dc25b7e08962a53794a06d5cc512ae))
- **dto:** read a renamed property only from its exposed name ([181faa4](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/181faa45217858c1e315411edc1fd4f1706e698c))
- **dto:** refuse a child class that takes over a renamed property key of its parent ([e839a59](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/e839a59758dd61d54b0c053029b35f6766779d57))
- **dto:** refuse a named expose next to an exclude ([4ee1738](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/4ee17388eff4c7ce4a722a704bc247ca00d62800))
- **dto:** refuse a request that sends a renamed property under its property key ([ecf3248](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/ecf3248bf181ccc0ee6e373bb5d109f3a0d713e6))
- **dto:** register the variants of an object property as extra models ([e173b9c](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/e173b9c19a1212d658b92181c96b66fb36889813))
- **dto:** reject a non-boolean array flag and name any decorated target ([d022fea](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/d022feaa0e5c49a0c67d24db75dbcd5b4b23837d))
- **dto:** reject object array bounds that are not valid values ([412303a](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/412303a9d8f5c3e43a769d84f4e8a371ab6ef130))
- **dto:** reject request object arrays without bounds at decoration ([e0eabc9](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/e0eabc9a04b8a3160b9a07e0f029278d29289ec9))
- **dto:** require only status code and message on every error status ([25f8533](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/25f8533f1eda89e998a3ab9cc70500208efb0b9c))
- **dto:** send one wire name on every path and publish it in the schema ([ce0d667](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/ce0d667682b712f124b6a6d2cc3d96a95b916099))
- **dto:** stop emptying free-form request objects under a whitelist pipe ([a5f8b1e](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/a5f8b1e0e04fe007b440059dab2b48a33c7ac4fd))
- **dto:** stop listing raw variants of a generated polymorphic property ([e8a7314](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/e8a7314c04f7f36b03b0d00ec9955b54dbb6b19b))
- **entity:** keep the base entity from making every key a column ([9a32058](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/9a320583dcadd6c55ffd8205e0929a6f2675908c))
- **error-string:** add not valid composite action ([4d424ca](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/4d424ca8118a086fbf8161bce382034386d49e9b))
- **error-string:** convert the rejected value codes other branches added ([4dc1b3c](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/4dc1b3c0b641a32a1403591afd5f9f5b35ee5c40))
- **error-string:** render timestamp in future as its own key ([97df093](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/97df09336bc808679b49ecf63602ebb389cd493a))
- **error-string:** use one not valid form for every rejected value code ([f327c4d](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/f327c4d30db6ac0969a3d3a85987a47eefab2218))
- **exception-filter:** give guard errors the correlation contract ([bdd3114](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/bdd311429c3e9e8d8556d1e858af39be79672bd2))
- **filter:** let page lists order by timestamptz and uuid columns ([1587ce5](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/1587ce5c4466c78b72927de6871a86eedeee2615))
- **function:** answer every duplicate key with one 409 body ([e9bf417](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/e9bf417c4836572bae38f2d6ca4896251fb78531))
- **function:** guard only the save the create function starts ([82a6ddb](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/82a6ddb3d66ac0a68a7d660148268cb3078357c9))
- **function:** keep create from changing a row that already exists ([ce680ba](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/ce680ba057c3097026b773a92f81553b66d3892f))
- **get-list:** bind boolean filter values as booleans ([f3d82f4](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/f3d82f4dcb782e6b10214c116ff4aeb81a4ebe8d))
- **interceptor:** accept only bounded client correlation ids ([e9f818e](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/e9f818e28bc5f3e230befaeda5e9c90cc7e932d5))
- **interceptor:** keep the original error as cause ([fd17638](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/fd176382e46acfc10a63fc696a7f432a89abf700))
- **interceptor:** keep the shape of an application error body ([f1b2a95](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/f1b2a954907dfa74fd679e646b801b0c9ed438cf))
- **interceptor:** spell out the correlation id class and derive its bounds ([6c11c87](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/6c11c87fec07a07201569be2f763890851eb5f20))
- **interceptor:** warn once per component outside http ([bba0dec](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/bba0dec6d94cfd99e142e7366536ff9ef6e964d4))
- **logger:** read ncd_log_level when a logger handles its first message ([7870ac1](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/7870ac14dfb2cd540bffa5bce72d9b1d7306657a))
- **logger:** stop loading the consumer .env on import ([7540262](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/75402629079df432b7796163ea8b1d5c57ad7e0d))
- **metadata-storage:** key describe metadata by class identity ([facc7d8](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/facc7d8d95c5c5c1411fc7643b28c4bcdafd34c2))
- **metadata-storage:** key entity registries by class and fail on ambiguous relation names ([44ce74e](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/44ce74e6df5c207d3c9af401a66eaf28a9d0acd0))
- **package:** import dependencies only through their root or explicit exports ([30d8bb9](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/30d8bb9dc6b8b53162f0f343013098b19442fb99))
- **route:** accept a body key only as the path string and drop it before save ([396ddaa](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/396ddaaa97cb07d238ec6ea31ec370f70ae54db9))
- **route:** accept a single legacy membership value like typed plans ([7a8d30e](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/7a8d30eeab5536cdca0e52ae21074e43a2d785ec))
- **route:** accept disabled hidden orders and refuse hidden typed filters ([2107995](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/2107995949559fca7159a3f27b890a205f1a8c26))
- **route:** accept the published text of a numeric enum filter value ([4306519](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/43065193d1c66fdbb6e678119f7d10640d20b0a5))
- **route:** answer put and patch with the row as get reads it ([23891bc](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/23891bc6dc9b51d27644184f14f02d646aaa21db))
- **route:** apply the body limits to form bodies and walk shared objects once ([4b84320](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/4b84320a7be24fe3e3beccd9cf4e122d9ffc9289))
- **route:** bind parsed numbers from legacy numeric list filters ([454655c](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/454655cf75659c05803e4d259a198c7693f6c785))
- **route:** bind server-side temporal list filter values as the instants they name ([c63cffe](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/c63cffe0da7f860f27d9912ad5acb08d2cb84dce))
- **route:** canonicalize described path values and apply one list rule ([2a05e03](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/2a05e03f13ed05f5751ea6198d286d76ababd1f2))
- **route:** check a uuid path value by its dto when startup checks are replaced ([ac80459](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/ac804595215eaa7ff91611c72fb7d66f510c2adc))
- **route:** check create date keys by the create temporal key rule ([6616a37](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/6616a370fc0c0a892b14e2c3ec9e794d0f9dea67))
- **route:** check every path parameter of a securable route before authorization ([b04d432](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/b04d4320d58681cfacf160965e83243ed4671ef9))
- **route:** check every placeholder of a row route and keep a create exempt ([91027ef](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/91027ef6f0dfb4817d25cb269fde9212c131b2b4))
- **route:** check relation date keys and publish relations as routes take them ([133416b](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/133416be9e24db8e241c9464ec810ecaee259ed5))
- **route:** check the list order a manual query dto produced ([b567959](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/b567959e86b62d4a0b4daa495bf3d37db80f7bc0))
- **route:** check the sent boolean and number under any expose name ([3654df4](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/3654df41d153c21f671cf3b55079b441135cc23d))
- **route:** compare a relation value with the sent body by its content ([291c680](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/291c6808c7c0da04075397fd822e22c2ba9ecb03))
- **route:** compare body keys with the path whatever pipe runs ([72a04c4](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/72a04c446ff671b1b275baceffb954bd475e9960))
- **route:** compare date column filters as calendar text on every path ([88921bc](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/88921bc36ba0ccd2d2f4d24446d90fe1214ef8a2))
- **route:** count path matches on raw rows and reload by every exact key ([4b36815](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/4b3681564537617b31936f41f4a7a7d411ce78bb))
- **route:** declare body parser and failure statuses on every route ([ed48bb7](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/ed48bb7ee8bded6a8cc8743fd2a8c6ff3e98e86d))
- **route:** declare guard statuses on custom routes ([fddbcfa](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/fddbcfad943cef1e315603f551c8f6eebc7a1646))
- **route:** declare the class guard statuses of a request-scoped subclass ([90041a3](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/90041a35c5dffd25afabdb6ca2e21dd1cfe2695f))
- **route:** declare the error statuses generated routes return ([e601383](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/e6013832de9e7252c22f96651c12d207ec4bf038))
- **route:** declare the statuses of any guard and of a response reload ([eea600a](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/eea600ad52e69583b895342fe79f6e1604232930))
- **route:** declare throttling and body parser statuses from the route config ([c55f3aa](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/c55f3aaedf601ae4e45185e7570dc04e08466c89))
- **route:** declare what securable creates and custom route configs raise ([df4b71c](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/df4b71c7bc7403c283089a7e2996f4cc573b1d4d))
- **route:** describe guard error bodies with or without the exception filter ([da2ff51](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/da2ff51ae649ca626b7180e1a8ad554b00e244b0))
- **route:** fail startup on a list filter a query dto publishes but cannot apply ([90a2cb0](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/90a2cb095614b81c0f645463ef25291e89f7fe10))
- **route:** fail startup on a list filter property exposed under another name ([840cdb9](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/840cdb95747717b902e186f37f312c2ebfabbf42))
- **route:** give a handler and a hooks policy the path value authorization saw ([862c252](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/862c252163877b0f8f74ddbbdc5468406c2244df))
- **route:** give authorization one canonical text for every path value ([442d6d0](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/442d6d026332546e00cbdff73bc9406046a2d674))
- **route:** give the handler what iam saw or refuse the request ([018ef85](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/018ef8537ade03257738d6f16a7bb2b6a96a4de0))
- **route:** hold a manual list query to the orderable fields ([e884952](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/e88495293094c389c9b993515b32e305eee45b22))
- **route:** hold date-time and time list filters to their published form ([1c51002](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/1c51002f1eeeba7fd0a91c724258b51c9e24527d))
- **route:** hold list filter values to the one number and boolean rule ([a4d58cf](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/a4d58cf7f04dd2f634b0db1dd82539c2fbd3b8c6))
- **route:** keep a cursor list walkable by a host serializer ([a46cc93](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/a46cc932a47965b42506a718434a70e80786523b))
- **route:** keep a route disabled on a securable child hidden ([be4f227](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/be4f22741ca939f9e12f565fe48eaa1531c4ff5d))
- **route:** keep a split relation's own columns and refuse non-string date keys ([9def9f9](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/9def9f9c2e90047b3670e186206b91f55c6801af))
- **route:** keep custom route rules per controller and read the sent boolean ([6cd4596](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/6cd459655cc98258dfe6ac799dea53e8a0d4c6c7))
- **route:** keep stored free-form values whole when converted to plain ([16f13b4](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/16f13b4831bd5ae9f75f9eb778a94b53fb368931))
- **route:** keep the 403 of an inherited route on its securable controller ([9c98344](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/9c98344b2a5e8c8a46d903a31d6e4223ea2be421))
- **route:** keep the before subscriber query for after subscribers ([4a637a1](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/4a637a14a4d526283e889a0149d8bc77c47e27be))
- **route:** leave the authorization guards out of the guard statuses ([b765fef](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/b765fef856ec9920c49dc327287bf7b0a645a385))
- **route:** leave the scoped 404 off a securable generated create ([b572ffd](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/b572ffd2d2c45d02b68efef651395728f4d30797))
- **route:** let a custom route answer on express 5, whose query has a getter ([51a7bd6](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/51a7bd60ada09ee36d1e4d3b2843cc32c45c77b2))
- **route:** name the cause when post saved a row without a key typeorm knows ([93836df](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/93836df8a04fd23ddf0d698e622f28b5132994dc))
- **route:** name the route of a hidden cursor order entry ([03109c3](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/03109c3b271f60e3fa03ec135fe535e893d5156b))
- **route:** name the route, field and reason of an unorderable typed order field ([1602e9c](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/1602e9c8388db0fa949acb1050491e23eaa177cf))
- **route:** narrow a custom list route with response variants ([d581757](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/d581757495b93345c170a8f057ba309607df1417))
- **route:** narrow the order fields of a custom list route to its response type ([5c6ad98](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/5c6ad98bbaf1f9d099a3cc4014a5c7f957d91a21))
- **route:** order by columns a parent class or table inheritance root declares ([ffd8558](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/ffd855880a4555d3ce38cd92c240e98e72035fe8))
- **route:** order only by columns the list response and query expose ([b40219e](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/b40219e24a979c553666323f340f7064bec73095))
- **route:** order only by columns whose values the list response exposes ([ed314f6](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/ed314f6176a98425d19a19647cae5942a479081f))
- **route:** order only by item fields a manual list response publishes ([c0a42eb](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/c0a42eb99eba34fa28d82d66fb19ba3a799cf915))
- **route:** parse number and uuid list filter values with one parser ([63ef2ab](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/63ef2abed2b281c3ca5d2bc251059bc7f0905dd4))
- **route:** probe a validation pipe without calling its exception factory ([4a44d40](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/4a44d40baa0a92537253bd6b2aa84f4e215f69cf))
- **route:** publish and apply list filters through to-one relations only ([fc588d1](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/fc588d12f7c49c7fdc15bfb4160a568e9e87e9b0))
- **route:** publish no order parameters when no list field is orderable ([317db65](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/317db65de959029199aa791f3625b8a08824a642))
- **route:** read a lazy list response after its classes exist ([740110c](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/740110cbb9f41386689eb150196295b111c23639))
- **route:** read exposed list query names from class-transformer metadata ([8280433](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/8280433b7e9a815f2c6a19a3b409e7fbd2ed2435))
- **route:** read list column lookups from the entity class hierarchy ([c804df8](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/c804df8b7833f534f6a7e99d026c7a74eafdff0b))
- **route:** read objects only from samples a route dto accepts ([9733dca](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/9733dca23c8b711c8dd234f70304a2f54d432010))
- **route:** read path parameters with the grammar of the running adapter ([680b51e](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/680b51e5216a86be3a58e19029aec74c5e296587))
- **route:** read the row post inserted by the key typeorm saved ([2f8cb3d](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/2f8cb3dfeb90d8e25d46d98183739853d195af7f))
- **route:** read the row put and patch wrote by the key of the request ([37c3365](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/37c3365f66b4914759de21ebba614217de64758b))
- **route:** refuse a create route that binds existing onetomany rows ([0577d46](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/0577d46e306f01bdebd8ccd0eeb9cf32d539dcc2))
- **route:** refuse a list filter the route cannot apply instead of listing all rows ([c930d2a](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/c930d2a4a5dbcc1e15a7d49ca14a5e1ffe721361))
- **route:** refuse a list filter whose value key its operator does not take ([1b74cbd](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/1b74cbd94351e9be923a0b9c91873c82409a2a19))
- **route:** refuse a malformed path value with failures a host filter can translate ([37eb7b9](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/37eb7b9c08298cab41cd59a9b99e9bfaa910a6be))
- **route:** refuse a manual query dto filter on a column the response hides ([2febaec](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/2febaec20836a777b212d5886e3136f4f6ed6e03))
- **route:** refuse a resource placeholder a route that does not list cannot fill ([b0e86cf](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/b0e86cf25fa777a7b4eeb04565764cc80a005a84))
- **route:** refuse an oversized body with failures a host filter can translate ([4c0c0f8](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/4c0c0f85205590b48d9067b882f440dc570b1529))
- **route:** refuse an upper-case uuid that a custom dto validates without a column ([eefda19](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/eefda19ba5530545de19091d484a6240358427f0))
- **route:** refuse limits the guard cannot run and spellings a database reads as one key ([6b98605](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/6b98605df2a5a8bcba194929413c7ade658966af))
- **route:** refuse list filters on columns the list response hides ([104b029](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/104b029abc8a46b513c7da60b419ae9b3517f8fc))
- **route:** refuse request bodies too wide or deep to reach a pipe ([a6cdcb4](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/a6cdcb47d9bc701dd76bf45d04d8216095409901))
- **route:** refuse reserved keys and nul in request bodies and read rows that hold them ([57ed1b8](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/57ed1b8a198ee8580f1086ea5ec13e71c9b1a8ab))
- **route:** refuse upper-case uuid paths, hooks decimal keys and unknown names ([0bb13d4](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/0bb13d4b531606fa4a0feda601cbf561a638dd26))
- **route:** reject a one-sided list order ([4849bb4](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/4849bb4314f32366434d19df1155429e3bd10711))
- **route:** reject every query key a legacy list dto does not publish ([5d2f801](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/5d2f80148abeb4d8434f4b8502122583a53ab57a))
- **route:** reject list filter groups the query schema does not publish ([fb338f9](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/fb338f96b73b87a4db4f672da74654054596241d))
- **route:** reload a custom route response by its complete key ([a133411](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/a133411297745b625541b2d10cc2a42f50c6a03b))
- **route:** require filter fields only on statuses the handler chain returns ([090f3e0](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/090f3e0475c2e2e205d8425958b0ec1d4d65cf4b))
- **route:** run the route dto so iam sees the value it produces ([49c7591](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/49c7591110cf833c3df74fcb847028aa15f2c993))
- **route:** take only a lowercase list order direction on typed routes ([a77a063](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/a77a06305f1b0b7c15c09844a5c68753b67a17e2))
- **route:** validate and type path parameters once per request ([79fedf1](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/79fedf15e977af58b5e378d7664a3a7caf249544))
- **route:** validate legacy list queries on the route itself ([dba068b](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/dba068bdd9adc1242108d9bb1240c5ff4a3ca1b0))
- **route:** validate typed list filter values against the published schema ([ec48cba](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/ec48cba0bd3bfeee4cf23fde1799568ce85a78cb))
- **route:** wrap a single legacy filter values item before converting it ([94bbd30](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/94bbd30ea33ac81e7b9d478bc593cbcf8207fc7c))
- **route:** write a composite relation through the entity's own columns ([b836b4c](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/b836b4c8f060a8a7da8e3c854619d49c900a4b43))
- **route:** write a relation's own column only from the body the route writes ([44900aa](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/44900aa446288a21f975d5bdcabfe20e4590b854))
- **route:** write a single-column relation through the entity's own column ([ad9e0d1](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/ad9e0d1ee7729c957157ed5faa5485de95e17948))
- **route:** write only the checked own column for a relation over one column ([05f49f7](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/05f49f7409fe55db51c6f48e8c16b7d40bd18702))
- **service:** refuse where criteria that would widen a query ([603abfe](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/603abfe026281062ee07a6008812dcb9ff114fad))
- **subscriber:** remove subscribers when the application closes ([1b28b22](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/1b28b22b6c5c8e71b8f1a860e8f23291c0fd7cc1))
- **transaction:** keep the manager of a transaction on its own data source ([19d84d8](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/19d84d857c7477b5b68f68c617e3a527858270c8))
- **transaction:** run owning transactions one at a time on a single-connection driver ([81b7e47](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/81b7e47d0806c2e1124ded0e07195ff23ad0ca9b))
- **type:** derive typed filter operations from the describe kind ([b29f366](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/b29f3665ca4945b489808d187351e43c8590ddd9))

### Build System

- **deps:** move to nestjs 12, swagger 12 and typeorm 1 ([c0452f6](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/c0452f6cbdfe49858d2614928a1ab2698b7b8ad2))
- **package:** publish an esm-only build with extension-qualified declarations ([93f9b07](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/93f9b079226e15e0e08aa3820c7c5754abcd0289))

### Code Refactoring

- **entity:** type relation columns with their relation type ([96a349f](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/96a349f10d81793b819a818f43740acb5026e2af))

### Features

- **controller:** serve polymorphic read responses for table inheritance entities ([b557092](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/b557092764832d844e809feb875767855bc9df28))
- **controller:** support composite primary keys in cursor pagination ([9280782](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/928078280445d004e54166a1e18128c58c78433e))
- **dto:** add a script that maps old openapi component names to new ones ([bf07f9a](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/bf07f9a88a3ed21d2f136eb02e01530ecb56df53))
- **filter:** allow in and notin membership filters on uuid fields ([80c8c7a](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/80c8c7a1bd66c31cbe78918a7d61a1f5ad9af118))
- **route:** add an exception that carries the failures of a request refused early ([1d8b1cc](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/1d8b1cc44d6258bb7a0fc14fac5c75eef44370ef))
- **route:** address generated row routes by every primary key column ([2f05926](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/2f0592628f58cf6e60a01fb624785445a815e3aa))
- **route:** bind controller path parameters on every generated route ([868e30e](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/868e30ef511bd0ae2414ec47c530f5ecfffd0e3c))

### Performance Improvements

- **controller:** cache to-many paths per entity class in the update guard ([b5eb58a](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/b5eb58a94345bf246bd1d13f3dc81f82f04cd61d))

### BREAKING CHANGES

- **route:** a CREATE route whose relations.request.load.include enables a OneToMany or inverse OneToOne relation fails at startup, the generated CREATE body no longer declares these relations, and a CREATE body that references existing rows through one answers 400. Migration: remove such relations from the CREATE include, create the parent first, then bind each existing row through the UPDATE or PARTIAL_UPDATE of that row, setting its to-one reference to the parent.
- **function:** a 409 UNIQUE_VIOLATION body no longer carries constraint, detail, field, table or value in details, and ExceptionDetailsUniqueViolationDTO no longer declares them. Migration: read message {ENTITY}_DUPLICATE_KEY and details.type instead of the driver fields; take the constraint name from exception.cause in a filter or a log when server code needs it.
- **route:** a relation over one join column is published in a generated body with the type and format of the column it references instead of a UUID; that column must be described with @ApiPropertyDescribe on the related entity, or startup fails; a relation value that differs from the entity's own column answers 400 PARAMETERS_NOT_VALID instead of being written; and null for a relation over a key column answers 400. Migration: regenerate clients from the new schema; describe each column a relation references on the related entity; send the relation with the same value as the entity's own column, or leave the column to the relation; do not send null for a relation over a key column.
- **route:** a generated body DTO publishes a relation over several join columns as an object of those columns instead of a string; a column such a relation references must be described with @ApiPropertyDescribe on the related entity, or startup fails; and a relation value that differs from the entity's own column, as the body, a transformer or the path sets it, answers 400 PARAMETERS_NOT_VALID instead of being written. Migration: regenerate clients from the new schema and send the relation as an object of its join columns; describe each referenced column on the related entity; send the relation with the same values as the entity's own columns, or leave them to the relation.
- **route:** the route read key is removed. Replace read: { scope: { parameters } } on GET and GET_LIST with pathScope: { parameters } on the controller. Every controller path parameter must now be bound when a generated route is enabled, otherwise declare it in pathScope or disable the route.
- **route:** generated GET, PATCH, PUT and DELETE on a composite primary key move from /:first to every key column in declaration order, and a date and time key column in that path must be timestamptz with precision 0 to 3, or startup fails. Declare rowPath: { fields: [...] } on the controller to keep a shorter path or to leave such a column out.
- **authorization:** a resourceDefinition field whose queryPath crosses a OneToMany or ManyToMany relation stops startup with an error naming the field and the relation. Passed to the simulator, such a key fails closed: an Allow is not matched and a Deny holds. Migration: map a column of the resource or of a to-one relation, such as a denormalized flag.
- **authorization:** a Deny StringEqualsIfExists on a query path through a relation now hides rows whose relation is missing, and an Allow StringEqualsIfExists now includes them, as the in-memory evaluator does. Two Allow keys on one query path both apply. A loaded resource is read through each field's queryPath instead of a property named after the path, a resource key that no field maps fails closed in memory, and StringEqualsIfExists through a relation to an entity without a primary column no longer compiles.
- **route:** a test that replaces ApiAuthorizationBootstrapValidationService checks the path values of a custom route by its PARAMETERS DTO, so an upper-case UUID answers 400 and a route startup would refuse answers 500. A PARAMETERS DTO with a copy that follows the route context fails startup on a route without route.type, and throws when declared for custom routes of two route types. Migration: send canonical path values in tests and fix a route as startup names it; give such a copy method and dtoType, or one PARAMETERS DTO per route type.
- **route:** a generated GET, UPDATE, PARTIAL_UPDATE, or DELETE route of a securable IAM controller fails at startup when the resourcePath names a placeholder that is not a path parameter of the route, such as x/t{tenant}/{id} under a controller path without :tenant. Migration: serve the route with @ApiRouteCustom under that path parameter copied with ApiPropertyCopy, or authorize it in HOOKS mode; a list keeps the placeholder only if its handler applies decision.scope.where, under the list action.
- **route:** an IAM @ApiRouteCustom or @ApiMethod route that does not list fails at startup when its resourcePath names a placeholder that is not a path parameter of the route. Migration: serve the placeholder as a path parameter copied with ApiPropertyCopy, or authorize the route in HOOKS mode. Declaring it a list (route.type GET_LIST or the action list) keeps the placeholder only if the handler applies decision.scope.where to its query, and the IAM action then becomes <policyNamespace>:list, so a separate action such as export merges into list.
- **route:** a ValidationPipe in @UsePipes of a securable route with a path parameter fails at startup with expectedType, transformerPackage, or validatorPackage. Migration: remove the option and let the PARAMETERS DTO convert the value.
- **route:** the global prefix and the RouterModule path count as path parameters of a securable route and follow the same rule as the route's own. Migration: describe their parameters in the PARAMETERS DTO; serve a generated route under them with @ApiRouteCustom and a PARAMETERS DTO that describes them, because read.scope.parameters maps only controller path parameters.
- **route:** a securable route with a wildcard (*, *name, {*name}) in any part of its path fails at startup naming the controller and method. Migration: replace the wildcard with named path parameters.
- **route:** a securable route with a path parameter fails at startup when @UsePipes on its method or controller holds a pipe other than ValidationPipe; a global pipe of the host is not checked. Migration: remove the pipe and let the PARAMETERS DTO convert the value.
- **route:** a securable HOOKS custom route fails at startup when its PARAMETERS DTO holds a path parameter without ApiPropertyCopy or an ApiProperty* decorator, such as a bare @IsInt() @Type(() => Number). Migration: describe the path parameter with ApiPropertyCopy or ApiProperty*.
- **route:** a @Param("id") whose type compiles to neither String nor Object, such as number or a class, fails at startup; string, unknown, any, and a union start. Migration: type @Param("id") as string, or read @Param() typed as the DTO.
- **route:** a request whose request.params holds a path parameter startup did not record for its route answers 500 before authorization. Migration: do not add path parameters to request.params before the guard.
- **route:** a securable HOOKS custom route answers 400 for a path value its PARAMETERS DTO rejects or does not keep, such as 016 or an upper-case uuid, before the policy runs, and its policy reads the canonical text. Migration: send canonical path values; a HOOKS policy compares canonical text.
- **route:** a securable @ApiRouteCustom or @ApiMethod route with a path parameter fails at startup without a PARAMETERS DTO that describes it, with a pipe on @Param such as ParseIntPipe, with a @Param("id") type that compiles to neither String nor Object (number, a class; string, unknown, any, and a union start), or with @Param() typed as another class than its PARAMETERS DTO. Migration: declare dto[EApiDtoType.PARAMETERS] with ApiPropertyCopy or an ApiProperty* decorator, turning an @ApiMethod route into @ApiRouteCustom; drop the pipe; type @Param("id") as string, or read @Param() typed as that DTO.
- **controller:** a date and time primary key in a generated CREATE body that names a day or hour the calendar does not hold, such as 2026-02-30, 2026-04-31, 2025-02-29 or 24:00, now answers 400 with "<key> must be a valid ISO 8601 date-time" before any SQL instead of storing the day it rolls over into. Migration: impossible calendar dates now answer 400 instead of rolling over; send a date that exists.
- **get-list:** an IAM resource condition or exact row-scoped Deny pattern on a boolean column, at any depth of queryPath and with or without ApiPropertyDescribe, compiles only for true, false or that exact text. Any other value, such as "1", "TRUE", "yes" or the number 1, a queryPath that TypeORM metadata cannot resolve to a column, and every resource key of an entity no TypeORM decorator maps no longer compile: an Allow statement with them is not matched, and a matched Deny with them denies the whole request with 403. A list, object or null condition operand no longer fails document validation; its key fails for an Allow and holds for a Deny. EFilterOperationBoolean no longer has EXCL, and excl on a boolean filter answers 400.
- **route:** a generated CREATE on a securable controller with authorization no longer declares 404 unless it loads a request relation.

Migration: regenerate API clients, and handle 403 for a body outside the policy scope.

- **controller:** a generated CREATE whose create or get function runs in mode NONE fails startup under every route mode.

Migration: set that function mode to SUPPORTS or REQUIRED.

- **authorization:** inside a transaction a route or function owns, onAfterErrorCreate runs after the rollback, with no event manager and the service repository.

Migration: read through DATA.repository, and move work that needs the transaction to onBeforeErrorCreate. A subscriber with transaction expectation REQUIRED or MANDATORY cannot have onAfterErrorCreate here, because its check needs a manager.

- **transaction:** a transaction scope opened on the data source of an active transaction joins it and rolls back with it, and refuses an observation.

Migration: work on another data source does not roll back with the create, so compensate for it yourself; settle an observation in a scope outside the create.

- **authorization:** a securable CREATE on a date and time key finer than a millisecond fails startup, including the PostgreSQL and CockroachDB default.

Migration: declare the key with precision: 3 and migrate the column.

- **transaction:** transactions the Automator opens on the SQLite family wait instead of overlapping.

Migration: do not rely on overlapping Automator transactions on the SQLite family.

- **authorization:** a generated CREATE route with NONE or an undecorated create or get fails startup.

Migration: use SUPPORTS or REQUIRED, and decorate or remove an undecorated create or get.

- **authorization:** a date and time primary key the database fills fails startup on mysql and sqlite.

Migration: send the key in the body, or fill it on postgres, cockroachdb or mariadb.

- **authorization:** a temporal CREATE key answers 400 without a zone on timestamptz or if too precise.

Migration: send ISO 8601 with Z or an offset with minutes, no finer than the column.

- **authorization:** a non-scoped CREATE rolls back on failure and refuses NONE and undecorated create.

Migration: expect one transaction per create, and use SUPPORTS or REQUIRED on the route.

- **authorization:** a generated CREATE whose key matches no row or several rows now answers 500.

Migration: leave a column that a trigger overwrites out of the body.

- **authorization:** a generated CREATE with an undecorated create or get fails startup.

Migration: decorate the function or remove the override.

- **authorization:** a generated CREATE outside its authorization scope now answers 403 and rolls back.

Migration: handle 403 instead of 404 on a create.

- **route:** a route with execution.guards or UseGuards now declares 401 next to 403, and a custom route whose response include only has keys set to false declares 404.
- **dto:** every Exception<Status>DTO requires only statusCode and message; error is optional on 404, 409, and validator statuses too, so clients generated from the document get an optional field.
- **route:** a securable generated create now declares 404, and custom routes declare their validator statuses and the 404 of a relation load. A plain sibling of a decorated base no longer declares 403. Regenerate API clients.
- **dto:** a to-many key on an update now answers details.type TO_MANY_UPDATE_KEY, each details variant declares its own single type value instead of the whole enum, and no exception schema requires correlationID or timestamp. Regenerate API clients.
- **route:** every route declares 400, 413, 415, and 500, custom routes and GET and DELETE routes included, and response.errors no longer accepts hasBadRequest or hasInternalServerError.
- **route:** CREATE, UPDATE, and PARTIAL_UPDATE routes and POST, PUT, and PATCH custom routes declare 413 and 415, custom body routes declare 400, and custom routes with throttling.default declare 429, so regenerated clients get these responses.
- **route:** ExceptionBadRequestDTO, ExceptionInternalServerErrorDTO, ExceptionPayloadTooLargeDTO, and ExceptionUnsupportedMediaTypeDTO mark correlationID, error, and timestamp optional, so regenerated clients get optional fields on these statuses.
- **route:** Custom routes declare 401 and 403 from security.authentication, execution.guards and a securable controller with authorization, even when response.errors leaves them unset.
- **route:** ExceptionUnauthorizedDTO, ExceptionForbiddenDTO and ExceptionTooManyRequestsDTO require only statusCode and message, with correlationID, error and timestamp optional, also on routes that declared 401 before.
- **route:** Generated routes declare 400 everywhere, 403 on secured routes, 401 only with security.authentication, no 404 on GET_LIST, and 404 on CREATE only with relations.request. The exception DTO declares details only on 400 and 409, and the invalid relation reference body gains details.type INVALID_REFERENCE.
- **route:** an upper-case uuid path value on a securable iam custom route returns 400 whatever its parameters dto, also with a bare @IsUUID or a lower-casing @Transform
- **route:** an upper-case uuid path value returns 400 instead of being lower-cased; send the lower-case uuid. A decimal, numeric, float, double or money column as a path value fails at startup in HOOKS mode as in IAM mode.
- **route:** a filter value on an integer or boolean column follows the rule of every other request value: 1e2, 1.0, 016 and a boolean 1 or 0 return 400. Send canonical integer text, and true or false.
- **route:** a securable iam custom route fails at startup when a path value has a transform limited to groups, since or until, an expose limited to since or until, or a validator limited to groups. On a generated route or a copied property, the text of an integer column must be canonical, so 016 and -0 return 400, and the default signed BIGINT_STRING pattern refuses -0 everywhere. A decimal, numeric, float, double or money column as a path value on an iam route fails at startup; use an integer, uuid or text key. requestMetadata.parameters and the parameters of a hooks context are Record<string, string>.
- **route:** a securable iam custom route whose parameters dto changes its own output, such as a prefix on every call or a decoder, or reads a value differently with and without implicit conversion, now fails at startup or returns 400. So does a dto that drops the path value, shadows its name with another property, or limits its transform to a group. Keep a transform stable on its own output or move the conversion into the handler; use ApiPropertyBoolean for a boolean.
- **route:** a value a custom route PARAMETERS DTO rejects is 400 without a host pipe
- **route:** a PARAMETERS DTO Transform also runs in the guard and once at startup
- **route:** an empty value for a date field is 400 instead of being dropped
- **route:** described custom route path values are checked before iam
- **route:** double text must be decimal in dtos, bodies and list filters; a lone list value is a list
- **route:** number and boolean dto values under any expose name and list filter values are checked as sent: 1e2, 1.0, 016 and a boolean 1 or 0 return 400
- **route:** the authorization guard requires the parameters rule registry
- **route:** inherited custom routes are checked per controller; boolean dtos read sent values
- **route:** path values reach authorization as canonical text and follow the column rule
- **route:** a generated route answers a path value that does not fit its described column type with 400 and the ValidationPipe body (message: string[], error, statusCode) before authorization and before any query, with or without a host pipe; a missing read.scope or identity value gets the same body. Read scope, subscribers and services receive typed path values (numbers for NUMBER keys, lower-case UUIDs); BEFORE_ERROR subscribers see the raw string when the check fails. Integer text is accepted only in canonical decimal form: in paths and typed query plans always, and in query DTOs and bodies under a host ValidationPipe. An integer NUMBER bound outside the safe integer range fails at startup, so bigint is described only as BIGINT_STRING, and NUMBER_CONSTANT.MAX_BIGINT and MIN_BIGINT are removed. DATE and TIME request values stay validated strings; only DATE_TIME becomes a Date. CURSOR tokens minted before 5.0.0 on routes with typed path values return CURSOR_NOT_VALID once.
- **route:** a request body to every @ApiMethod route, generated routes, ApiRouteCustom and plain ApiMethod routes included, that holds the key **proto**, constructor, hasOwnProperty or prototype at any depth, or a NUL character in any string or key, answers 400 before any pipe. Migration: rename such keys in client payloads, and send binary data as base64 rather than as a string holding NUL.
- **dto:** a child class that exposes a property under the property key of a renamed @ApiProperty* property of its parent now fails; rename one of them.
- **dto:** a request that sends an @ApiProperty* property under its property key now gets a 400. Next to the exposed name the last key sent used to win; the key alone was dropped by default and bound only under exposeUnsetFields: false. Send the exposed name.
- **dto:** a renamed property of an @ApiProperty* decorator is read only from its exposed name, also under ValidationPipe({ transformOptions: { exposeUnsetFields: false } }).
- **dto:** a nested manual DTO on a generated route now runs its own @Transform and @Type in the copy the route generates, so a masked or converted value no longer goes out raw.
- **dto:** a generated route and @ApiRouteCustom without ClassSerializerInterceptor now read a renamed response property from its property key and send its exposed name, which the schema publishes too. Swap the key and the name of such a property. A property under @Exclude({ toPlainOnly: true }) is now left out of a response sent without the interceptor.
- **dto:** a nested manual DTO on a generated route now honours its @Exclude and @Expose: a request uses the exposed name, and an excluded property is neither returned nor stored.
- **controller:** a route whose own write function is missing or unfitting fails at startup.
- **route:** post answers with the row it inserted, and a plain create override behind it fails.
- **controller:** a route reading through a missing or unfitting GET function fails at startup.
- **route:** generated PUT and PATCH responses no longer echo relation keys of the request body.
- **route:** GET_LIST filters on a column the list response hides return 400 FILTER_NOT_VALID, and a select: false column leaves the orderBy enum. A PAGE route with a manual list response fails at startup until every filter it publishes is a field that response publishes. Migration: filter by a published field; for such a route set request.query.filter.fields.<field> to { isEnabled: false }, leave the field out of a REJECT allowlist, or set properties.getList.query.isEnabled: false on the property. A field an authorization resultTransform removes at request time is not covered, since the rule reads describe and TypeORM metadata: disable its filter yourself.
- **dto:** a date or date-time of year 0000 now answers 400 in a request body. ApiPropertyString with format DATE fails at decoration; use ApiPropertyDate with EApiPropertyDateType.DATE or DATE_TIME.
- **dto:** under a host ValidationPipe, request bodies accept only the published form of a date property. A DATE_TIME value without milliseconds, with an offset, without a zone, or as a number, any impossible day, and an array on a single property return 400. DATE and TIME request values stay strings instead of becoming Date objects, and the message is "<property> must be in <form> format" (isDateFormatValue) instead of "must be a Date instance" (isDate).
- **route:** on a GET_LIST route without a typed filter and with a manual QUERY DTO, a filter group whose value key its operator does not take returns 400 FILTER_NOT_VALID. An eq operator with values used to compare against the joined text, an empty values key used to answer no rows, and between with one value used to match nothing. Send a single value for single-value operators and values for in, notin and between.
- **route:** a controller whose manual GET_LIST QUERY DTO, on a route without a typed filter, exposes a filter property under another name now fails at startup. It used to answer the unfiltered list. Remove the name from the expose decorator.
- **route:** on a manual GET_LIST QUERY DTO with @Expose({ name }), the property behind the alias, such as orderBy next to sort, returns 400 with `property orderBy should not exist`. It used to bypass the DTO's validators. Send the exposed name.
- **route:** a controller whose manual GET_LIST QUERY DTO, on a route without a typed filter, publishes a filter group the route cannot apply now fails at startup. Remove the key, or point it at a described column or a one-hop to-one relation path.
- **route:** GET_LIST routes with a manual QUERY DTO and no typed filter return 400 FILTER_NOT_VALID for a filter group that is incomplete, that has both [value] and [values], that has a value next to isnull or notnull, or that names a field the route cannot apply, such as a to-many path. These requests used to return the unfiltered list.
- **route:** GET_LIST routes without a typed filter return 400 for any query key the QUERY DTO does not publish, including cache-buster and tracking parameters such as `_=1730000000` or `utm_source=mail`, and keys like `nmae=x` or `name[foo]=x`. Clients must stop sending them or the DTO must publish them.
- **route:** GET_LIST routes with a generated QUERY DTO and no typed filter no longer publish or apply filters on fields of to-many relations, such as tags.name[operator]=eq&tags.name[value]=x. They return 400 instead of the filtered list, and the generated OpenAPI query parameters no longer list them. Use a custom method for to-many filters.
- **route:** GET_LIST routes without a typed filter return 400 for a filter group whose field the QUERY DTO does not publish, with or without a host ValidationPipe, instead of the unfiltered list. This includes id[...] filters on the root primary key and, on a route with a manual QUERY DTO, filters on entity columns the DTO does not declare, which the route used to apply from entity metadata.
- **error-string:** EErrorStringAction.TIMESTAMP_IN_FUTURE now renders as {ENTITY}_TIMESTAMP_IN_FUTURE instead of {ENTITY}_IN_FUTURE. See the table in "Rejected value codes in 5.0.0" in docs/guides/error-handling.
- **error-string:** INVALID__, **INVALID, WRONG**, MALFORMED__, INCORRECT_PASSWORD and the composite INVALID, BAD and MALFORMED keys are renamed or merged into *_NOT_VALID. Responses change too: INVALID_FILTER becomes FILTER_NOT_VALID and {ENTITY}_INVALID_REFERENCE becomes {ENTITY}_REFERENCE_NOT_VALID. See the table in "Rejected value codes in 5.0.0" in docs/guides/error-handling.
- **controller:** a class whose decorator return value was discarded now runs bootstrap checks.
- **controller:** a CURSOR route on another database fails at bootstrap.
- **controller:** the unrecognized repository error text changed.
- **controller:** a controller whose service has no TypeORM repository fails at bootstrap.
- **dto:** a request number on a property with a fractional multipleOf is now checked against that step. Values that used to pass against the truncated divisor, such as 4 on a step of 2.5, return 400, and values that fit the step, which used to return 400, pass.
- **route:** GET_LIST routes without a typed filter return 400 INVALID_FILTER for the name of a numeric enum member, and for an enum value outside the enum on a route with a manual QUERY DTO that declares no filter property. Numeric text of a member, which a host pipe used to reject, now filters on every route.
- **route:** GET_LIST routes without a typed filter compare a date-time filter value as the Date it names, as typed routes do. On timestamp and datetime columns without a zone, TypeORM writes that Date in the process time zone, where the route used to compare the UTC text. An invalid date or time defaultCondition now fails with 'Controller "<name>" route "getList": GET_LIST filter defaultCondition for "<field>" must be ...' instead of '... has an invalid typed value'.
- **route:** GET_LIST routes with a manual QUERY DTO return 400 INVALID_FILTER for an empty, blank or malformed uuid filter value, where SQLite used to return an empty list and PostgreSQL a 500.
- **route:** GET_LIST date-time filters accept only YYYY-MM-DDTHH:mm:ss.sssZ on typed and legacy routes. A value without milliseconds, with an offset, without a zone, or with only a date now returns 400. Time filters, which returned 400 for every value, now accept HH:mm:ss, and a typed defaultCondition on a time field takes that text.
- **route:** GET_LIST filters on date-format columns accept only YYYY-MM-DD. A value with a time or an offset, or an impossible day such as 2024-02-30, now returns 400 on typed and legacy routes. Typed plans compare the calendar text instead of a Date, and a typed defaultCondition on such a field takes calendar text, not a Date. A TypeORM value transformer on a date column receives this text in to, never a Date. One that handles only a Date answers 500 where it used to answer 200, and startup cannot detect it, so change it to accept YYYY-MM-DD text.
- **route:** typed GET_LIST routes return 400 for filter values outside the entity minimum, maximum, multipleOf, length, format or pattern whether or not the host registers a ValidationPipe. A partial operator is held to the field's whole format or pattern, so mail[operator]=cont&mail[value]=exam on an email field returns 400.
- **route:** a request body deeper than 64 levels, or with an object holding more than 1000 keys, answers 400 on every generated, ApiRouteCustom and ApiMethod route.

Migration: bodies over the limits now answer 400. The limits are fixed, so send a free-form object of more than 1000 keys as an array of entries.

- **controller:** a relations.request block that would fail at request time now fails startup, on every entity and enabled route. At decoration this covers an include or lock key that is not a relation on the route entity or its parent classes, including a relation declared only on a child entity, a lock without an enabled include, with an unknown mode, on nested relations without query loading or on a route with transaction mode NONE, and a malformed reference, include, locks or service override. At application bootstrap it covers a nested key that is not a relation of the related entity, and a missing or invalid service. Such routes used to start: CREATE, UPDATE, PARTIAL_UPDATE and custom routes with a body then answered with 500, and GET, GET_LIST, DELETE and custom routes without a body ignored the block. Fix or remove the block. REQUEST-scoped controllers get no bootstrap hook, so the bootstrap checks stay at request time for them.
- **dto:** a property with @Exclude or isExpose: false and a named @Expose, own or inherited, now fails at startup. Remove one of them, or limit the exclude with @Exclude({ toPlainOnly: true }).
- **dto:** a property whose explicit Expose used to be erased now reads and writes the name the Expose declares. An application bundling another class-transformer entry fails at decoration.
- **authorization:** @ApiMethod or @ApiRouteCustom with @MessagePattern, @EventPattern or @SubscribeMessage on a securable controller no longer starts. Move the handler to a controller that is not securable. ApiAuthorizationBootstrapValidationService takes MetadataScanner and ModulesContainer as its second and third constructor arguments, which moves the others back: code that calls the constructor by hand passes them in those positions.
- **authorization:** a securable controller fails startup with a @MessagePattern or @EventPattern handler without authorization, or a handler replaced on the instance by a function without its authorization. Move a pattern handler to a controller that is not securable, and remove the assignment. A request-scoped controller answers 403 instead, as startup cannot see it.
- **authorization:** an application with a controller marked @ApiControllerSecurable() fails app.init() unless it imports ApiAuthorizationModule. Import the module, or remove the decorator. Non-securable controllers are not affected.
- **controller:** a route disabled on a child controller is no longer served through the parent. To keep it, remove @ApiController from the child or declare the route there. See docs/guides/migrating-to-5-0.
- **authorization:** a securable controller with a plain Nest route, inherited ones and plain overrides included, no longer starts. Declare the route with @ApiRouteCustom or @ApiMethod, or move it to a controller that is not securable. See docs/guides/migrating-to-5-0.
- **controller:** GenerateEntityInformation and GetClassHierarchy no longer return columns, relations or classes above a parent class without a name, which TypeORM never mapped, and a column declared again on a subclass is listed once. Name the class a mixin returns.
- **interceptor:** an object error response no longer gains error or message through CorrelationIDResponseBodyInterceptor, CorrelationIDResponseBodyExceptionFilter, or CorrelationIDNormalizeException, so new NotFoundException() answers without error and a codes-only exceptionFactory body answers with neither; read both fields as optional on those bodies.
- **dto:** the id key is checked at startup, and soft-deletable to-one targets are nullable.
- **dto:** response relation schemas, non-id OBJECT references and key startup checks changed.
- **dto:** shouldKeepDiscriminatorProperty false on a request property fails at decoration; remove the option, since such a property rejected every body that carried it. A root-level body with false and a variant that requires the property fails at startup. A response property that leaves the option out now returns the discriminator; set false and isResponse true to keep leaving it out, or on entity metadata disable the write bodies with isEnabled false.
- **metadata-storage:** apiSubscriberRegistry.getFunctionSubscribers and getRouteSubscribers take the entity class instead of its name. IDtoGenerateCacheKey takes the entity class as `entity` instead of `entityName` and the guard class as `guard` instead of `guardName`. MetadataStorage.getMetadata and setMetadata, the subscriber registry lookups and the policy registry's buildAggregatedPolicy, hasSubscriberForEntity and invalidateCache throw a TypeError for anything but a class. A controller with an enabled generated route fails startup when its service repository is for a class outside the lineage of its entity. GenerateEntityInformation no longer merges the columns of same-named classes. A string relation target that names several entity classes fails at startup on every GET_LIST route that can filter by it. Two GET_LIST item classes with one name on one entity need distinct wrapper names, and one wrapper name on one entity cannot serve PAGE and CURSOR routes.
- **metadata-storage:** MetadataStorage.setMetadata and getMetadata take the entity class instead of its name, and getMetadata includes the metadata of the class's ancestors. getAllEntitiesMetadata returns a Map keyed by class instead of a record keyed by name. A { name } entity reference that matches no @Entity class, or several, now fails at startup.
- **dto:** a polymorphic variant class that a generated route references through a contextual copy is no longer a component of the OpenAPI document, so a client type generated from its name goes away. Use <Parent><Property><Variant>DTO, or declare @ApiExtraModels(...) with the class to keep the component.
- **dto:** shouldValidateNested true on a property with type Object or an undefined type, and a type list that holds Object, fail to compile and fail at decoration naming the class and property. Remove the option; a free-form array no longer needs it. A list that holds Object answered 500 on every request.
- **dto:** a free-form request value keeps its keys under a whitelisting ValidationPipe, and forbidNonWhitelisted no longer rejects them; code that relied on the emptied value must drop those keys itself. A free-form array item that is not an object answers 400 with "each value in <name> must be an object", which also rejects a nested array that passed before.
- **entity:** IApiBaseEntity is object, so it has no index signature and no name. Index access to a key an entity does not declare, an unknown column in create or update, and an unknown filter or orderBy no longer compile on an interface extending it. Casting a non-generic entity to Record<string, unknown> is TS2352. A declare module augmentation of IApiBaseEntity is TS2300, even with skipLibCheck. The entity option of ApiController and of the property decorators, and ErrorString and GenerateEntityInformation, take a TApiEntityReference. It refuses an object with other keys, a non-string name, a string, null, an array and an instance of a class without a name. It cannot refuse an empty object, an object-typed value or any function; ApiController throws for those when the class is decorated. IApiEntity no longer extends IApiBaseEntity. scopeToOwner takes a key of the entity or its default ownerId. ApiControllerTransformData with the request of a GET or GET_LIST route no longer compiles on an interface entity, matching class entities.

Migration: declare every key on the entity or on your own interface extending IApiBaseEntity, and remove any augmentation of it and any cast added to call getList or update. Read other keys through keyof E, Reflect.get or as unknown as. Pass a class or give the object a name. In code generic over E, assert the getList query as TApiControllerGetListQuery<E>, and pass ownerId as keyof E or no argument to scopeToOwner.

- **route:** a manual GET_LIST QUERY DTO that exposes orderBy or orderDirection under another query name now answers 400 INVALID_ORDER for a field outside the orderable fields and for a direction other than lowercase asc or desc, also without an alias.
- **route:** the startup error of a CURSOR order field that is not raw-exposed in the response starts with the controller and route.
- **route:** a GET_LIST route with a manual QUERY DTO answers 400 INVALID_ORDER when a client orders by anything outside its orderable fields, whatever the DTO allows.
- **route:** on a PAGE GET_LIST route with a manual response DTO, a typed order field the DTO does not publish fails at controller instantiation instead of at decoration, and a response DTO whose schema cannot be read fails startup with an error that names the controller and route, with or without Swagger.
- **route:** an @ApiRouteCustom GET_LIST route with an array response.type and a generated QUERY DTO now documents and accepts only order fields every variant publishes. Under a host pipe any other field answers 400.
- **route:** an empty or blank numeric filter value on a route without a typed filter answers 400 INVALID_FILTER. It used to return 500 on PostgreSQL and no rows on SQLite. A value such as 1e2 or 1.0 now filters by the parsed number.

Migration: send a number in numeric filter values.

- **route:** orderBy without orderDirection, or orderDirection without orderBy, answers 400 INVALID_ORDER on routes without a typed filter. orderBy alone used to apply a default direction and orderDirection alone was ignored.

Migration: send both, or set a class default on a manual QUERY DTO.

- **route:** a route with a typed filter or CURSOR pagination answers 400 INVALID_ORDER to orderDirection=ASC or DESC, which it accepted without a pipe.

Migration: send orderDirection=asc or desc.

- **dto:** DTO_GENERATE_CONSTANT.MINIMUM_FILTER_PROPERTIES is removed; DTO_GENERATE_CONSTANT keeps MAXIMUM_FILTER_PROPERTIES.
- **route:** A GET_LIST route on which no column is orderable no longer documents orderBy or orderDirection, and a request that sends either answers 400.
- **route:** An @ApiRouteCustom GET_LIST route with autoDto QUERY and one response.type class publishes only the order fields that class publishes in its schema, and a host ValidationPipe answers 400 for any other orderBy.
- **route:** a legacy in or notin filter with a single value now filters by that value instead of returning 400 under a host ValidationPipe.
- **route:** on a GET_LIST route with a manual response DTO, ordering by a column the DTO does not publish returns 400 on legacy routes and INVALID_ORDER on typed routes, and a typed order field naming one fails at startup.
- **route:** ordering a GET_LIST route by a column whose response side sets `isExpose: false` returns 400 on legacy routes and INVALID_ORDER on typed routes, and the column leaves the orderBy enum.
- **route:** GET_LIST routes no longer accept orderBy on a column disabled as a GET_LIST query field or hidden from the GET_LIST response for the route guard. Legacy routes answer 400 with the enum message, typed routes answer INVALID_ORDER, a typed order.fields entry naming such a column fails at startup, and the column leaves the OpenAPI enum.
- **route:** on PAGE GET_LIST routes without a typed filter, route after and error subscribers receive the raw request query with string values, as changed by before subscribers, instead of the instance a transforming host ValidationPipe produced.
- **route:** PAGE GET_LIST routes without a typed filter return 400 for query values outside their DTO whether or not the host registers a ValidationPipe. orderDirection is lowercase only, limit and page are required and capped at 100, in and notin take one or more values, between takes exactly two, and isnull and notnull reject a value. isnull and notnull without a value now filter instead of being ignored. Route-before subscribers on these routes see the raw query instead of the instance a transforming pipe produced.
- **dto:** a request array with isUniqueItems true answers 400 for equal items, and for items nested more than 64 levels.
- **api:** a securable controller now fails at startup when a custom @ApiMethod or @ApiRouteCustom route, declared or inherited, has no resource.action or has a resource.entity other than the controller entity. The prerequisites follow the resolved mode of each custom route: one that resolves to hooks requires a registered policy, and one that resolves to iam requires the IAM configuration, also when the controller default is the other mode.
- **dto:** code that reads a TApiProperty*Properties value and narrows on isArray === true gets minItems, maxItems and isUniqueItems as possibly undefined; also check isResponse !== true.
- **dto:** a request @ApiProperty* array without minItems, maxItems or isUniqueItems fails at decoration, as does any array whose bounds are not non-negative integers, or whose isArray or isUniqueItems is not a boolean. That includes maxItems: Number.POSITIVE_INFINITY and a fractional bound, which compiled and worked before.
- **dto:** the GET_LIST page wrapper component is <Prefix>GetListPageDTO and the CURSOR wrapper is <Prefix>GetListCursorPageDTO, instead of <Entity>GetListResponseItemsDTO and <Entity>GetListCursorResponseItemsDTO in 4.x. A table inheritance discriminator value ITEMS is accepted. A value ending in DTO loses that part of its name suffix, so VIP_DTO gives <Prefix><Route>ResponseVipDTO, unless nothing else is left, so the value DTO gives <Prefix><Route>ResponseDtoDTO.
- **api:** the BODY, PARAMETERS and QUERY DTOs of an ApiRouteCustom handler that a decorated controller inherits from a base class or mixin are named <Prefix><Method><DtoType>DTO after that controller instead of after the class that declares the handler, one set per controller. A custom route declared on a class without a name fails startup when a class that is not decorated with ApiController serves it.
- **dto:** a relation or dynamic object variant copied with ApiPropertyCopy is named <Host><HostProperty>DTO or <Host><HostProperty><Variant>DTO, where <Host> is the host DTO class name without a trailing DTO in any case and <HostProperty> is the PascalCase name of the decorated host property, instead of <Entity><Route><DtoType><EntityProperty>DTO.
- **dto:** the schema prefix and component name checks run when the application starts (app.init() or app.listen()) instead of when a controller is decorated, and only over the controllers of that application. Two controller classes with one prefix fail whatever their paths, a hand-written DTO of a custom or plain route named like another class fails, and an unresolvable lazy type fails. Tests that expected an error from importing a controller module must start an application, and a document built with SwaggerModule.createDocument before app.init() is not checked.
- **dto:** a nested generated DTO is named <Parent><Property>DTO, or <Parent><Property><Variant>DTO for a dynamic object variant, at any depth, so a relation inside a variant gives a name such as UserGetResponseDetailsV1OwnerDTO. Relation, variant and manual copy segments keep their letters: createdBy gives CreatedByDTO instead of CreatedbyDTO, userID gives UserIDDTO instead of UseridDTO, created_by gives CreatedByDTO instead of Created_byDTO, v2Item gives V2ItemDTO instead of V2itemDTO and HTMLContent gives HTMLContentDTO instead of HtmlcontentDTO. A property or variant ending in DTO in any case loses that part, so pageDto gives PageDTO, unless nothing else is left, so dto gives DtoDTO. A name of separators only, such as _, fails startup.
- **dto:** startup fails when two different classes have one component name anywhere in a generated route's schema, including DTOs configured with dto and plain Swagger classes nested in them. DtoGenerateGetListResponse and DtoGenerateGetListCursorResponse take an optional trailing origin used in that error.
- **api:** ApiRouteRuntime.executeGenerated takes a required schemaPrefix in IApiRouteRuntimeGeneratedExecutionOptions, the prefix of the decorated controller class. Generated routes pass it; only code that calls executeGenerated directly needs the change.
- **dto:** generated DTO and OpenAPI component names start with the controller's schema prefix and no longer contain the entity name, for example UserEntityGetResponseDTO on UserController becomes UserGetResponseDTO, and every $ref follows. The 4.x typed query, identity and read scope parameter DTOs change the same way, and custom route DTOs use the handler method name, for example PublicUserGetMeParametersDTO. Regenerate API clients. Startup fails for two controller classes with one prefix, for an anonymous controller class, and for two different generated DTO classes with one name. DtoGenerate and DtoGetGetListQueryBaseClass take a required schemaPrefix argument after dtoType, ApiControllerGetDto after routeConfig, ApiControllerApplyDecorators after decorators, and DtoGenerateTableInheritanceResponse after method. ApiControllerGetSchemaPrefix returns the prefix.
- **controller:** TApiControllerMethodName, TApiControllerMethodNameMap and TApiControllerTargetMethod give create, delete, get, getList, partialUpdate and update instead of a `${string}Create` pattern, so a name such as xCreate no longer compiles. An instance of TApiControllerTargetMethod has all six methods as required properties. The target of ApiControllerFactory is a TApiControllerConstructor.

Migration: call the generated methods by their runtime names. A cast on a value already typed with these types can go. A decorated class still needs a type assertion or declaration merging, because a decorator cannot change a class's type.

- **dto:** an @ApiPropertyObject whose isArray is not a boolean fails at decoration.
- **dto:** an @ApiPropertyObject array whose minItems or maxItems is not a non-negative integer, or whose isUniqueItems is not a boolean, fails at decoration.
- **dto:** a request @ApiPropertyObject array without minItems, maxItems or isUniqueItems fails at decoration instead of rejecting every request value.
- **controller:** an @ApiRouteCustom route of type UPDATE or PARTIAL_UPDATE answers a to-many relation key, null included, with the same 400 INVALID_REFERENCE before its handler runs.
- **entity:** IApiEntityColumn.type is typed as ColumnType or the TypeORM relation type, which it already held for relation properties.
- **controller:** the OpenAPI document no longer has the empty <Entity><Method>Body<property>DTO components.
- **controller:** UPDATE and PARTIAL_UPDATE reject any to-many relation key, null included, whatever relations.request says, and their body schemas no longer declare to-many relations.
- **controller:** the new 400 for a to-many key on update has details { propertyName, reason }; the to-one INVALID_REFERENCE body with expectedShape and referenceKey is unchanged.
- **controller:** GetEntityColumns and IGetEntityColumnsProperties are no longer exported.
- **controller:** UPDATE and PARTIAL_UPDATE reject a to-many reference in relations.request with 400 INVALID_REFERENCE, and custom routes receive it as a one-element array.
- **controller:** a custom route without a declared type no longer reads { items } as an envelope when its resource entity owns an items property.
- **controller:** a route that declares a type other than GET_LIST no longer reads a response with an items array as a list envelope, so entity relations named items are projected.
- **controller:** to-many response relations are arrays of references on the wire and in the generated Swagger schema instead of a single object.
- **controller:** zone-less filter values on datetimeoffset columns answer 400.
- **controller:** cockroachdb query relations over temporal keys fail at bootstrap.
- **controller:** such filter values answer 400 INVALID_FILTER instead.
- **controller:** zone-less date-time filter values on timestamptz columns now answer 400.
- **filter:** generated orderBy values now include timestamptz and uuid fields, and cursor primary key order errors read differently.
- **controller:** query relations, to-many relation ids and loadRelationIds that bind temporal postgres keys now fail at startup and on every read.
- **controller:** joined PostgreSQL reads of temporal primary keys change query shape, and relation order paths on them and "query" relation loading over temporal join columns now fail.
- **controller:** timestamp, Date-constructor and untyped date cursor order fields now fail at bootstrap with new error texts.
- **controller:** cursor bootstrap error texts for primary keys and tie-breakers changed to name the complete primary key.
- **package:** the package is ESM-only, without dist/cjs or the require condition.
- **deps:** NestJS 12, @nestjs/swagger 12, TypeORM 1 and Node.js 22.13 or 24.11 are required, and the @nestjs/throttler peer floor rises from >=6.5.0 to >=6.7.1.
- **logger:** the package no longer loads a .env file; load it in the application.
- **service:** a generated service call whose where would widen the query now throws.
- **interceptor:** a client x-correlation-id longer than 128 characters, with characters outside [A-Za-z0-9._:-] or sent as a repeated header is no longer echoed; the response header and error body carry a generated UUID instead. The OpenAPI schema of correlationID is now a string of 1 to 128 characters with that pattern, not a UUID.
- **exception-filter:** every error body has correlationID, error, message, statusCode and timestamp
- **controller:** A table inheritance root with no loaded child entity, or a discriminator value with characters outside [A-Za-z0-9_-], now fails startup.
- **controller:** A table inheritance root with a hidden, unselected or numeric discriminator, or a value producing an invalid or clashing DTO name, now fails startup.
- **controller:** GET and GET_LIST over a table inheritance root drop the <Root>GetResponseDTO and <Root>GetListResponseDTO schemas; startup fails when the discriminator is not declared as a described property, a leaf value is outside the column enum, a discriminator value is numeric, or a child entity loads after the controller; GenerateEntityInformation(Child).tableName now returns the root table.
- **deps:** peer ranges now end below the next untested major or 0.x minor, so NestJS 12, TypeORM 1 and other newer releases no longer satisfy them.

# [4.7.0](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v4.6.0...v4.7.0) (2026-10-23)

### Bug Fixes

- **route:** resolve discriminated dtos from own mapping keys only ([ca817f0](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/ca817f0f38b7d69d96ca266b18154a77636f1eda))

### Features

- **route:** add exception factory for discriminated request bodies ([cb30c1d](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/cb30c1d5c10ca2243478462cc215f2ae13830677))

# [4.6.0](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v4.5.0...v4.6.0) (2026-10-19)

### Bug Fixes

- **lint:** narrow enum values without unsafe assertions ([63566e1](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/63566e104ed90ab433731ae5832c35cb6e8fd738))

### Features

- **route:** add configurable guard stages ([5ba1002](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/5ba10024af4217fc55a14f68f4b1181452a28d28))

# [4.5.0](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v4.4.0...v4.5.0) (2026-09-23)

### Features

- **transaction:** observe selected native execution ([fc3db68](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/fc3db68ba73885e666f4c10c9154141136306786))

# [4.4.0](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v4.3.5...v4.4.0) (2026-09-22)

### Bug Fixes

- **metadata:** use object for property decorator targets ([4aa5b79](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/4aa5b79e12e1177fcddbd3b3c1ac5f383733d43f))

### Features

- **update:** support atomic supplied-column patches ([195004c](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/195004c7ac40de0e1d5f05a374443811ed1cda27))

## [4.3.5](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v4.3.4...v4.3.5) (2026-09-03)

### Bug Fixes

- **api-function-update:** preserve malformed patches for subscribers ([2faad1f](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/2faad1f9f839e46154642f57d6edf9a32ac4a230))

## [4.3.4](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v4.3.3...v4.3.4) (2026-09-03)

### Bug Fixes

- **api-function-update:** omit undefined patch fields ([7fa8a86](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/7fa8a86b4f32572a0bbae601d391e50d2bea212e))

## [4.3.3](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v4.3.2...v4.3.3) (2026-09-02)

### Bug Fixes

- **api-property-object:** support open nested requests ([0ecb3bb](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/0ecb3bb03d064156c5c8ddc350be76db0086f510))

## [4.3.2](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v4.3.1...v4.3.2) (2026-09-01)

### Bug Fixes

- **lint:** mark unused parameters explicitly ([a9b7d83](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/a9b7d83a573bf21ee8eaa8721e06fd7f07fd76c5))
- **logging:** bound error evidence ([5d0f223](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/5d0f223726337972a2be0457c89d06982e695371))

## [4.3.1](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v4.3.0...v4.3.1) (2026-08-25)

### Bug Fixes

- **api:** accept standard nest guards ([374ad52](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/374ad52aef18b2744e25ad9941fd99bd98dc13b3))

# [4.3.0](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v4.2.1...v4.3.0) (2026-08-25)

### Features

- **dto:** allow properties to opt out of generation ([00eba99](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/00eba994b6a129209e4ec7ad98d5819e865ce3e5))

## [4.2.1](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v4.2.0...v4.2.1) (2026-08-24)

### Bug Fixes

- **api:** validate discriminated object arrays per item ([26ef691](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/26ef69113223cd909696125c3e8f36eacc8ff7af))

# [4.2.0](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v4.1.0...v4.2.0) (2026-08-23)

### Features

- **authorization:** inject request decisions ([ec1d402](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/ec1d4024cc52c1a7691b304d665602258110c744))

# [4.1.0](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v4.0.1...v4.1.0) (2026-08-23)

### Features

- **api:** compose custom route concerns [skip ci] ([1ca63fe](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/1ca63fedc14c8ac506855dfb4d38d1c772acf99d))
- **api:** promote custom route composition ([e906868](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/e906868d6eb1a6ac98ff2447bb9b82957b3201a4))

## [4.0.1](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v4.0.0...v4.0.1) (2026-08-20)

### Bug Fixes

- **query:** allow primary scalar filter plans ([daefe1f](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/daefe1fa178082b2c4e86333b0b6d07ef91879a8))
- **release:** promote primary scalar filters ([e14078d](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/e14078d5c2eb9eac01aeaf99305ac4e5f20e44c8))

# [4.0.0](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v3.0.2...v4.0.0) (2026-08-20)

- feat(controller)!: enforce generated service capabilities ([17cd27a](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/17cd27a6238872a609e3330889b565490c7630c5))

### Bug Fixes

- **controller:** preserve generated read security boundaries ([e790eaa](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/e790eaa99ae136c4df73123d79bd7dc40f2f255b))
- **release:** promote automator 4 stable ([bfb448a](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/bfb448a345ae7abe09b18986302d3785c483be50))
- **release:** retry npm publication ([f2f6c12](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/f2f6c12d84433acd6685bb420bce7ede6ee4e5bd))

### Features

- **controller:** add bidirectional cursor pagination ([ee37f52](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/ee37f52d363ec27dfe768b382419fa8c6db71408))
- **controller:** add generated primary identity aliases ([8b524fb](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/8b524fb4e4b5c42e163403edadc61d28ae6c6b28))
- **controller:** add scoped generated reads and deterministic ordering ([b6e3d54](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/b6e3d5483b2344757428118b47df71ddf980955a))

### BREAKING CHANGES

- Generated routes now reject undecorated reserved CRUD service overrides and require the exact same-entity function produced by @ApiService or the matching @ApiFunction* before transaction or I/O.

## [3.0.2](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v3.0.1...v3.0.2) (2026-07-26)

### Bug Fixes

- **transaction:** expose scope entity manager ([2691cbc](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/2691cbcfbd5066dab81d3a4f21637f3c6b6dd364))

## [3.0.1](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v3.0.0...v3.0.1) (2026-07-26)

### Bug Fixes

- **packaging:** emit portable typeorm declarations ([d5082c0](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/d5082c0f54119fd6963901d1ce53c4df60754198))

# [3.0.0](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v2.10.0...v3.0.0) (2026-07-26)

- feat(api)!: expose current entity before updates ([90c650b](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/90c650bfe6c89c831a10179f1d96117d1c150b9c))
- feat(dto)!: use semantic timestamp ownership ([bed4401](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/bed440175a9349e0cdcbb042c5c06a75ef36e82a))
- refactor(structure)!: enforce repository conventions ([561ade2](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/561ade2e9d93b3f50a6024af5b8b8f70744560dd))

### Bug Fixes

- **lint:** align dynamic contracts with stricter analysis ([952f8bd](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/952f8bd226e8b82dfbc234b2b0b6950d65ffe868))

### Features

- **transaction:** add generated route transactions ([2f98624](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/2f98624fd4581bac0534489698063d58949b0a79))

### BREAKING CHANGES

- UPDATE before hooks now run after the decorated GET.
- BIGINT_STRING sign options now require the new sign enum.
- Write DTO timestamp ownership now follows date identifiers instead of field names.

# [2.10.0](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v2.9.0...v2.10.0) (2026-06-09)

### Features

- **api:** document response headers and grouped security ([cf3bd1f](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/cf3bd1f0a73894d1cbf17c4e101db9160597b15c))

# [2.9.0](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v2.8.0...v2.9.0) (2026-06-08)

### Features

- **api:** type route subscriber authorization expectations ([4d12d06](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/4d12d0653664cf1660f685ebb9899a07b7f56d6b))

# [2.8.0](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v2.7.0...v2.8.0) (2026-06-07)

### Features

- **api:** enforce subscriber transaction expectations ([ab87813](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/ab87813a431bfc6a5a2e6f7710308177c9688c09))

# [2.7.0](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v2.6.0...v2.7.0) (2026-06-06)

### Features

- **api:** add transaction-aware function steps ([690a12f](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/690a12f098192f0325f89f61b7af322406fca03d))

# [2.6.0](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v2.5.0...v2.6.0) (2026-06-06)

### Features

- **api:** align request relation loading with include ([abd3ed7](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/abd3ed7b0583d6ddfffb79c313f6acda14c7a98a))

# [2.5.0](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v2.4.0...v2.5.0) (2026-06-06)

### Features

- **api:** type function subscriber before results ([c2057b5](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/c2057b5e39fe978ef1c546e92e3cc1fa14e04607))

# [2.4.0](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v2.3.0...v2.4.0) (2026-06-06)

### Features

- **api:** configure generated crud transactions ([a5de085](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/a5de08511f56d79b16fc60706580ec38cdcec67d))

# [2.3.0](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v2.2.0...v2.3.0) (2026-06-05)

### Features

- **api:** support nested relation list filters ([b0c8427](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/b0c8427d60c993cf742e808f4bf5eea3d3905178))

# [2.2.0](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v2.1.2...v2.2.0) (2026-06-05)

### Bug Fixes

- **tooling:** pass files to prettier ([5d744d4](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/5d744d40d3192024bc89d775c4cfcee1107e79fe))

### Features

- **api:** support discriminated custom route dtos ([0d86c7b](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/0d86c7b521f66d21cd516d2fb2d18cccd525c2f4))

## [2.1.2](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v2.1.1...v2.1.2) (2026-05-19)

### Bug Fixes

- **deps:** pin swagger before exports regression ([55c5ad3](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/55c5ad3be0aec503ba28cde83a26e0fe9c4090f5))
- **swagger:** correct relation response identifiers ([a86cd92](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/a86cd92319f07de27cd332ba934dd8fce2a415ce))

## [2.1.1](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v2.1.0...v2.1.1) (2026-05-11)

### Bug Fixes

- **swagger:** improve route documentation wording ([9dd7367](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/9dd7367332c846c8f065be684289c2a7e9427750))

# [2.1.0](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v2.0.4...v2.1.0) (2026-05-11)

### Bug Fixes

- **swagger:** refine generated route documentation ([d6981dd](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/d6981ddfb9ba89db10bb12913829bdcdb0f9f2e1))

### Features

- **swagger:** generate route documentation ([646f578](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/646f5783f278258a81b6e0adbc57f8554848e1f5))

## [2.0.4](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v2.0.3...v2.0.4) (2026-05-08)

### Bug Fixes

- **swagger:** document custom route request dtos ([01e6a77](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/01e6a7739bfa0943ce20ee77085d5b0e26c781ae))

## [2.0.3](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v2.0.2...v2.0.3) (2026-05-07)

### Bug Fixes

- **auth:** clean cache invalidation and declarations ([875545d](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/875545d0412ad4b42fa551e68b3455025888010b))

## [2.0.2](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v2.0.1...v2.0.2) (2026-05-06)

### Bug Fixes

- **esm:** fully specify external subpath imports ([c5c30e7](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/c5c30e73ba07fc8708129414514dec1051e79f9c))

## [2.0.1](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v2.0.0...v2.0.1) (2026-05-06)

# [2.0.0](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v1.24.0...v2.0.0) (2026-05-04)

- feat(api)!: introduce v2 route runtime contract ([aed2088](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/aed2088783b13b5a8ae853d48a7b7cf2a0cb2338))

### BREAKING CHANGES

- Controller route configuration, custom route/function contracts, subscriber context shapes, and request/response transformer targets now follow the v2 nested runtime model.

# [1.24.0](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v1.23.0...v1.24.0) (2026-05-01)

### Bug Fixes

- **api:** isolate manual dto metadata in generated dtos ([2b66b01](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/2b66b01f859c9d543d2822fc3893d5830e69dd84))

### Features

- **api:** add get-list item response dto config ([7904474](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/79044741f94c6a92acbef774825eb91b8b292c2d))

# [1.23.0](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v1.22.0...v1.23.0) (2026-03-20)

### Features

- **api:** add inheritance support for entity metadata and swagger generation ([d81ee35](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/d81ee35b3a34c24f5567d3c8dca75948adb9f562))

# [1.22.0](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v1.21.1...v1.22.0) (2026-03-16)

### Features

- **api:** add auto dto response exposure for nested objects ([f0755f9](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/f0755f9c59efc3fdf584e7429380342c8d0d8c82))
- **authorization:** add iam-based authorization engine with policy documents and attachments ([1fe8b78](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/1fe8b7811698609f898e57ab12e53ee314bde224))
- **authorization:** add subject resolver and permission matching capabilities ([3de3924](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/3de3924175080bf3f0f903bbd0fdf40310e66023))

## [1.21.1](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v1.21.0...v1.21.1) (2026-01-31)

# [1.21.0](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v1.20.0...v1.21.0) (2026-01-21)

### Features

- **authorization:** add return type definitions for policy lifecycle methods ([dcc3700](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/dcc3700136ae4d8c10f3c569495193f796f50111))

# [1.20.0](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v1.19.0...v1.20.0) (2026-01-16)

### Features

- **authorization:** unify policy context and caching ([ff8a64d](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/ff8a64d349be00983c2e3f0632a93970559d90b6))

# [1.19.0](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v1.18.0...v1.19.0) (2026-01-15)

### Features

- **database:** add automatic handling for database constraint violations ([bd853ab](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/bd853abc994d508d66b6a173231320978ab151a2))

# [1.18.0](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v1.17.1...v1.18.0) (2025-11-24)

### Features

- **property-decorators:** add entity factory support and property copying functionality ([75a581c](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/75a581cbfa6ef0616e802397754fe1d29a2e3def))

## [1.17.1](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v1.17.0...v1.17.1) (2025-11-18)

# [1.17.0](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v1.16.0...v1.17.0) (2025-11-18)

### Features

- **api:** add comprehensive authorization system with policies and guards ([594e02e](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/594e02e3347f73b7bb694f820dce217f16df85b0))

# [1.16.0](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v1.15.0...v1.16.0) (2025-10-17)

### Features

- **api:** add comprehensive subscriber system with execution contexts ([f3880a9](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/f3880a9089a1b10ab56b5142531e5c558c274d91))

# [1.15.0](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v1.14.0...v1.15.0) (2025-10-17)

### Features

- **api:** add credit card validation support for string properties ([d75cb2a](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/d75cb2a7d2b7040d97ed38fa01957af1db6ebe9f))

# [1.14.0](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v1.13.0...v1.14.0) (2025-10-17)

### Features

- **api:** add format property to default string format constants ([8788f39](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/8788f397aa11b3a793630b52822d80a4cc95e27b))

# [1.13.0](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v1.12.0...v1.13.0) (2025-10-17)

### Features

- **api:** add sha1, sha512, and password string format types ([3ebc769](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/3ebc76900f39cc18d7bcb35947fa0ace3ed75383))

# [1.12.0](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v1.11.3...v1.12.0) (2025-10-17)

### Features

- **api:** add default string format properties and update documentation structure ([e5e09df](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/e5e09df77772e71e3ee53e09673bbe18636bbbe8))

## [1.11.3](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v1.11.2...v1.11.3) (2025-10-16)

## [1.11.2](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v1.11.1...v1.11.2) (2025-10-16)

## [1.11.1](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v1.11.0...v1.11.1) (2025-10-16)

# [1.11.0](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v1.10.4...v1.11.0) (2025-10-16)

### Features

- **interface:** add api type exports to class interface module ([f9a0c1f](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/f9a0c1f71cf97ab4cace2237a28c200fc37b8ba8))

## [1.10.4](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v1.10.3...v1.10.4) (2025-08-06)

## [1.10.3](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v1.10.2...v1.10.3) (2025-06-22)

## [1.10.2](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v1.10.1...v1.10.2) (2025-06-22)

### Bug Fixes

- **api:** correct metadata key access and filter condition logic ([da1ccd8](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/da1ccd8d8126ee66fe9f129ac07233ad097da26f))

## [1.10.1](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v1.10.0...v1.10.1) (2025-06-21)

# [1.10.0](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v1.9.0...v1.10.0) (2025-06-19)

### Features

- **emitter:** new base emitter functionality ([2fbe0a6](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/2fbe0a6955a44312baf0318a60470943f261765b))
- **emitter:** upgraded emitter ([af6c4e5](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/af6c4e5b6e9140b845247027c6c5b698c308c11d))

# [1.9.0](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v1.8.0...v1.9.0) (2025-03-27)

### Bug Fixes

- **decorator:** use provided discriminator value for dynamically generated dtos ([2b16a41](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/2b16a412f19637602a0ca33004cf86c45f88495d))
- **dto:** ensure consistent handling of required and nullable properties in api decorators ([4773e60](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/4773e6013dd77ff0604ac109f125f04a8c48c0c9))

### Features

- **api-property:** add support for discriminated object types ([b91da48](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/b91da48f49596bd3916bd9dc67bc6e5be8635a57))
- **decorator:** add apiproperty copy decorator and improve jsdoc documentation ([b2a5eae](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/b2a5eae6b9159d37c5e3370bf0d789cb8cebb0a1))
- **dto:** add support for dynamically generated dtos with discriminators ([cea34d2](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/cea34d2c8888205038147ade80e638d0f8a43407))
- **dto:** add support for nested dynamic dtos and improve camel case handling ([a56fe5c](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/a56fe5c1db0985f38b6075a5b4fc4ac3597db8b3))
- **validator:** add schema validation and improve decorator documentation ([d075bb4](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/d075bb411bff418b01defdc6021e71fa3239d031))

# [1.8.0](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v1.7.0...v1.8.0) (2025-03-24)

### Bug Fixes

- **api:** correct return type for getmany function from single entity to array ([8527d53](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/8527d530e24ce5485b98e17fc7a1b374079713a5))

### Features

- **api:** add transaction support to api service methods ([328fbe4](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/328fbe49be0fb38399a0ddc11ba3550c70ffc985))

# [1.7.0](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v1.6.5...v1.7.0) (2025-03-23)

### Features

- **api-transform:** add optional key handling in data transformation ([dbcf9b2](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/dbcf9b2934bf85a77a5519d738d467a133f9bac6))
- **logging:** add logger utility and implement error logging for api functions ([6c521a1](https://github.com/ElsiKora/NestJS-Crud-Automator/commit/6c521a12dfdf956dc84870f769feed665cfd3b51))

## [1.6.5](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v1.6.4...v1.6.5) (2025-03-19)

## [1.6.4](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v1.6.3...v1.6.4) (2025-03-19)

## [1.6.3](https://github.com/ElsiKora/NestJS-Crud-Automator/compare/v1.6.2...v1.6.3) (2025-03-16)
