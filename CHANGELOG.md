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
