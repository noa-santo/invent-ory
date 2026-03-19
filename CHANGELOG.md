# Changelog

## [0.1.1](https://github.com/noa-santo/invent-ory/compare/v0.1.0...v0.1.1) (2026-03-19)


### Features

* add .gitignore to exclude frontend environment variables ([85eb103](https://github.com/noa-santo/invent-ory/commit/85eb10349082c0be91946efbe7af2d94dcfeecdc))
* add bundle icons ([0fb2989](https://github.com/noa-santo/invent-ory/commit/0fb2989c22cfc5c27d1c72791d50526cc46509ae))
* add CI pipeline and release-please automation ([6ea968c](https://github.com/noa-santo/invent-ory/commit/6ea968cf632f85d1e9edd798e04d93173c1b432d))
* add Docker Compose configuration for PostgreSQL and backend service ([1b9d0fc](https://github.com/noa-santo/invent-ory/commit/1b9d0fc7d7dd99382c875d27b42c9f6b7af9bab8))
* add example environment configuration file for local development ([085d955](https://github.com/noa-santo/invent-ory/commit/085d9553231194074e76345b8eea3c3ffaddfb12))
* add optional component data to inventory upsert and update logic ([8e88b5e](https://github.com/noa-santo/invent-ory/commit/8e88b5e25375149555ca15ac90c89975ab6a946f))
* add settings modal for user preferences and refactor API URL retrieval ([823444f](https://github.com/noa-santo/invent-ory/commit/823444f5055a120597805f8e1238eda577f91fe2))
* enhance LCSC scan data parser to support multiple formats and improve part number extraction ([7ba3edf](https://github.com/noa-santo/invent-ory/commit/7ba3edfea5affbcf99e9314bc4454a0438e67b25))
* migrate to shadcn/ui components with dark theme ([f4c68d8](https://github.com/noa-santo/invent-ory/commit/f4c68d889ffd925423ea3f7a4bf7daf1c1bdb0e9))
* refactor Layout component and improve icon rendering ([fec72a9](https://github.com/noa-santo/invent-ory/commit/fec72a9ea805de4cd9a34b01e52c8812689379a7))
* scaffold Tauri + React + TypeScript + Tailwind frontend ([1268652](https://github.com/noa-santo/invent-ory/commit/12686521ed488606019d9a43d3fd008c9e73a823))
* update inventory item endpoint to use request struct for optional fields. this fixes inventory editing ([f5f61c2](https://github.com/noa-santo/invent-ory/commit/f5f61c24efacd13da4033d5395e46a8d5cd61e6e))
* update Scanner component for improved barcode scanning and debugging ([377ac31](https://github.com/noa-santo/invent-ory/commit/377ac31f923d22d6ee76a9567765bbd22b9bc432))


### Bug Fixes

* address code review - use bg-input for inputs/select, make textarea resize configurable ([ebc63e4](https://github.com/noa-santo/invent-ory/commit/ebc63e4716dcd3783c29ec48590e92de48231d26))
* make pngs rgba instead of grey scale ([ea54d26](https://github.com/noa-santo/invent-ory/commit/ea54d262e8f8b8230e014cbf19f7bee9c8f11b6d))
* unwrap api data properly ([cd985fd](https://github.com/noa-santo/invent-ory/commit/cd985fd5c5c9cf090fa8e2bd14b0205a40076930))


### Documentation

* correct typos and improve clarity in README features section ([b5e7631](https://github.com/noa-santo/invent-ory/commit/b5e7631609b8bd50ce0f644d5617b530252640c1))
* update README with planned features for PCB inventory app ([4196af5](https://github.com/noa-santo/invent-ory/commit/4196af5c171142b579b00baed1acb268e863fb5b))


### Code Refactoring

* clean up comments and improve clarity in LCSC scan data parser ([4db1400](https://github.com/noa-santo/invent-ory/commit/4db140053a96f66796e074b4d16dd023b0c73c5f))
