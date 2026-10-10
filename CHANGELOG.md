# Changelog

## [1.2.0](https://github.com/ndum/kairos/compare/v1.1.1...v1.2.0) (2026-10-10)


### Features

* allow a second stop per place ([#31](https://github.com/ndum/kairos/issues/31)) ([1a20032](https://github.com/ndum/kairos/commit/1a2003295774ab8da283fbea102fca8fce8ef184))
* **i18n:** add French and Italian ([#32](https://github.com/ndum/kairos/issues/32)) ([20eae54](https://github.com/ndum/kairos/commit/20eae54497059590e70fa6977c33f4f42a8d9f4f))
* plan around a weekly schedule per route ([#29](https://github.com/ndum/kairos/issues/29)) ([31e3aea](https://github.com/ndum/kairos/commit/31e3aeaa145ee7331de63b5951ae72ed60d61a61))
* show the weather at the stops ([#30](https://github.com/ndum/kairos/issues/30)) ([a4e6b52](https://github.com/ndum/kairos/commit/a4e6b52df27e7bf163f373aeaaeb4770f60ca662))
* **ui:** ask what comes next after a new route ([#23](https://github.com/ndum/kairos/issues/23)) ([79d5385](https://github.com/ndum/kairos/commit/79d5385391240f179f22f2bfb80273ee8cebfc7c))
* **ui:** count down in the page title and on the app icon ([#27](https://github.com/ndum/kairos/issues/27)) ([69d414f](https://github.com/ndum/kairos/commit/69d414f35414c1922cbedecf5f4e0c23d9590821))
* **ui:** share a trip or add it to the calendar ([#28](https://github.com/ndum/kairos/issues/28)) ([48a9fdc](https://github.com/ndum/kairos/commit/48a9fdcedfb35f6ea6215ecbb4e7a2158210ff3c))


### Bug Fixes

* serve the app from its own domain ([#26](https://github.com/ndum/kairos/issues/26)) ([3abe776](https://github.com/ndum/kairos/commit/3abe7762a40d5344264eca411d0bfe7a460104aa))
* **ui:** smooth a few English texts ([9610539](https://github.com/ndum/kairos/commit/96105394d70afbace0569fcab6e0b21b5b31016a))
* **ui:** translate the location hint after a change of language ([20eae54](https://github.com/ndum/kairos/commit/20eae54497059590e70fa6977c33f4f42a8d9f4f))


### Performance

* **i18n:** load only the language in use ([31e3aea](https://github.com/ndum/kairos/commit/31e3aeaa145ee7331de63b5951ae72ed60d61a61))


### Documentation

* show the English interface in the README screenshots ([#25](https://github.com/ndum/kairos/issues/25)) ([9610539](https://github.com/ndum/kairos/commit/96105394d70afbace0569fcab6e0b21b5b31016a))

## [1.1.1](https://github.com/ndum/kairos/compare/v1.1.0...v1.1.1) (2026-10-10)


### Documentation

* name all three refresh intervals of the board ([#21](https://github.com/ndum/kairos/issues/21)) ([88c2864](https://github.com/ndum/kairos/commit/88c286451d477edac42390f062345becd8ecaad4))

## [1.1.0](https://github.com/ndum/kairos/compare/v1.0.0...v1.1.0) (2026-10-10)


### Features

* always suggest the fastest trip ([#16](https://github.com/ndum/kairos/issues/16)) ([fa778fe](https://github.com/ndum/kairos/commit/fa778fe8b13de45aa2f1e7d2b1902b66ea39b6f8))
* find places by address and suggest the stops nearby ([#18](https://github.com/ndum/kairos/issues/18)) ([e2e9e6f](https://github.com/ndum/kairos/commit/e2e9e6f49fa0024b6600ea054cbdbcd0f42a0507))
* keep one buffer per route instead of a reserve per place ([fa778fe](https://github.com/ndum/kairos/commit/fa778fe8b13de45aa2f1e7d2b1902b66ea39b6f8))
* **ui:** credit swisstopo and OpenStreetMap below the place search ([9d1e830](https://github.com/ndum/kairos/commit/9d1e830ccd6e4c3b2fd162f169c217f4a21fbb2c))
* **ui:** offer variants of the connection and edit routes on one page ([e2e9e6f](https://github.com/ndum/kairos/commit/e2e9e6f49fa0024b6600ea054cbdbcd0f42a0507))
* **ui:** open the details of every trip on the board ([fa778fe](https://github.com/ndum/kairos/commit/fa778fe8b13de45aa2f1e7d2b1902b66ea39b6f8))
* **ui:** open the settings and the trip details at the side of large screens ([04af6b9](https://github.com/ndum/kairos/commit/04af6b934f641f822f7997f07ca23d5ad1948798))
* **ui:** prefer the lines of a trip from its details ([e2e9e6f](https://github.com/ndum/kairos/commit/e2e9e6f49fa0024b6600ea054cbdbcd0f42a0507))
* **ui:** rework the look after the refined Alpenglühen design ([#20](https://github.com/ndum/kairos/issues/20)) ([04af6b9](https://github.com/ndum/kairos/commit/04af6b934f641f822f7997f07ca23d5ad1948798))
* **ui:** show the route as a title that unfolds a list of all routes ([04af6b9](https://github.com/ndum/kairos/commit/04af6b934f641f822f7997f07ca23d5ad1948798))


### Bug Fixes

* **infrastructure:** drop the zeros in front of train numbers in lines ([fa778fe](https://github.com/ndum/kairos/commit/fa778fe8b13de45aa2f1e7d2b1902b66ea39b6f8))
* keep the direction by location working in the installed app ([fa778fe](https://github.com/ndum/kairos/commit/fa778fe8b13de45aa2f1e7d2b1902b66ea39b6f8))
* **ui:** show the route to edit right after the editor for a new route ([e2e9e6f](https://github.com/ndum/kairos/commit/e2e9e6f49fa0024b6600ea054cbdbcd0f42a0507))


### Documentation

* describe version 1.1 and add a coverage badge ([#19](https://github.com/ndum/kairos/issues/19)) ([9d1e830](https://github.com/ndum/kairos/commit/9d1e830ccd6e4c3b2fd162f169c217f4a21fbb2c))

## 1.0.0 (2026-10-10)


### Features

* **application:** keep journeys up to date with adaptive polling ([#6](https://github.com/ndum/kairos/issues/6)) ([3a625c0](https://github.com/ndum/kairos/commit/3a625c0a53d7b7eebb110cbe46f8495c2ec76653))
* **domain:** leave times, urgency and trip selection ([#4](https://github.com/ndum/kairos/issues/4)) ([a8957c7](https://github.com/ndum/kairos/commit/a8957c756422889224c61920bfdede0acbe18411))
* **infrastructure:** read timetables from transport.opendata.ch ([#5](https://github.com/ndum/kairos/issues/5)) ([8a4f279](https://github.com/ndum/kairos/commit/8a4f27955925a2dc2377ef118dee487e42b27979))
* **ui:** add the app shell with the animated panorama ([#7](https://github.com/ndum/kairos/issues/7)) ([c69490d](https://github.com/ndum/kairos/commit/c69490dbde0ca927a6e699e825b3d5df571165b4))
* **ui:** check every view against WCAG 2.2 AA ([#14](https://github.com/ndum/kairos/issues/14)) ([bfc87a7](https://github.com/ndum/kairos/commit/bfc87a7e82c516bbefdc0c1413421f38e37aebcf))
* **ui:** choose the direction by the position of the device ([#11](https://github.com/ndum/kairos/issues/11)) ([801ae55](https://github.com/ndum/kairos/commit/801ae55d7acc0279c80f7216db81fd86cf1c2eaf))
* **ui:** count down to leaving on a live board ([#10](https://github.com/ndum/kairos/issues/10)) ([fce3728](https://github.com/ndum/kairos/commit/fce3728911bee49de50346c3b37fcb5377e31b1a))
* **ui:** plan trips and pin one with its own countdown ([#12](https://github.com/ndum/kairos/issues/12)) ([72c8e90](https://github.com/ndum/kairos/commit/72c8e9086f0576e025d7a7e2fb85a61315d902f7))
* **ui:** set up routes with a three-step assistant ([#8](https://github.com/ndum/kairos/issues/8)) ([5fcc1e8](https://github.com/ndum/kairos/commit/5fcc1e8ad5615a2fbfb7de406bf6d4dc581113f3))
* **ui:** share routes by link and QR code ([#9](https://github.com/ndum/kairos/issues/9)) ([ca6e89e](https://github.com/ndum/kairos/commit/ca6e89ef833409300e8cc0f97c8ddcbbe772f84c))
* **ui:** start offline as an installable app ([#13](https://github.com/ndum/kairos/issues/13)) ([2116b0a](https://github.com/ndum/kairos/commit/2116b0a4311c5dcbcf9ce021ca7c50b9fd1db107))


### Documentation

* add README, contributing guide, code of conduct and ADRs ([04119cf](https://github.com/ndum/kairos/commit/04119cf047145fe74dd5e4d9094cb234c966b551))
* show the app in the README and describe version 1.0 ([#15](https://github.com/ndum/kairos/issues/15)) ([3f6e917](https://github.com/ndum/kairos/commit/3f6e9176c39b6396cf9ec438a8f3ab6b94e06b6d))
