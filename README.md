# Baba × Keke

Sääntöjä muuttava kaksinpeli iPadille ja PC:lle. **Versio 1.1.0** toimii asennettavana offline-PWA:na. Myös paikallinen AI toimii ilman verkkoyhteyttä.

**Pelaa:** https://ymouse91.github.io/babaisyou/

## Asenna iPadille

1. Avaa peliosoite Safarissa verkkoyhteydessä.
2. Odota pelin ilmoitusta **Valmis offline-peliin**.
3. Valitse **Jaa → Lisää Koti-valikkoon**.
4. Avaa peli Baba × Keke -kuvakkeesta. Sen jälkeen voit pelata ilman verkkoa ja ilman käynnissä olevaa PC:tä.

PC:n Chromessa tai Edgessä voit käyttää selaimen asennuspainiketta. Peli toimii myös tavallisessa selainvälilehdessä. Uudesta versiosta ilmoitetaan **Päivitä peli** -painikkeella; päivitys ei käynnisty kesken pelin itsestään.

Ensimmäinen verkkokäynti tallentaa laitteelle koko pelin, molemmat maailmat, AI:n, kuvakkeet ja fontit. Pelitilanne ja kielivalinta säilyvät selaimen paikallisessa muistissa. Eri laitteiden välistä synkronointia tai verkkokaksinpeliä ei ole.

## Pelaaminen

**Valitse tasot** avaa maailmojen 1 ja 2 yhteensä kymmenen tasoa. DEFAULT on aina mukana ja lisäksi voi valita enintään kaksi tasoa yhteensä kummastakin maailmasta. Valitse Baballe ja Kekelle erikseen Ihminen tai AI. Suomenkieliset merkit ja lauta valitaan samasta ikkunasta.

Napsauta hahmoa ja kohderuutua siirtyäksesi ilman vetoa. Raahaaminen hiiri tai sormi alhaalla vetää paloja mukana. FAST voi liikkua useita ruutuja; vetomatkan voi rajata pysähtymällä hetkeksi väliruutuun ennen jatkamista. Tarkemmat säännöt ovat pelin **Miten pelataan?** -ikkunassa.

Maailma 1 sisältää MORE ROCK, MORE FLAG / FAST / HOT–MELT / CURIOUS / SQUARE. Maailma 2 sisältää WIN HARDER / THIRSTY / STRONG / SCARED / SHEEP. Maailman 2 tulkinnat perustuvat projektissa vahvistettuihin sääntöihin. CURIOUS reagoi heti myös juuri muodostuneen säännön synnyttäneeseen toimintoon. Hyväksytyn työpohjan silmukkakäsittelyssä on edelleen rajaus: häviö ratkaistaan enintään kuudelle tarkistettavalle kohteelle, jos kaikki kokeillut järjestykset johtavat silmukkaan. Muut silmukkatapaukset hylätään.

## Kehitys ja julkaiseminen

Tarvitset Node.js 22:n tai uudemman. Tuotantopeli ei tarvitse npm-riippuvuuksia.

```sh
node server.mjs
node server.mjs --lan
npm test
npm run build
npm run check
```

Paikallinen palvelin toimii oletuksena osoitteessa http://127.0.0.1:4173/. `--lan` näyttää koneen lähiverkko-osoitteen. iPadin offline-asennukseen käytetään julkista HTTPS-osoitetta; tavallinen HTTP-lähiverkko-osoite sopii verkkotestaukseen.

Muokkaa lähdetiedostoja `index.html`, `style.css`, `app.mjs`, `engine.mjs`, `ai.mjs` ja `sw-template.js`. Versionumero määritellään `engine.mjs`-tiedoston `APP_VERSION`-vakiossa. Pienet korjaukset: 1.1.1, uudet ominaisuudet: 1.2.0, yhteensopivuuden rikkovat muutokset: 2.0.0.

`node build.mjs` generoi `peli.html`- ja `sw.js`-tiedostot samoista lähteistä. `--check` varmistaa niiden synkronoinnin. `--dist` rakentaa erillisen julkaisukansion, johon kopioidaan vain pelin tarvitsemat tiedostot. GitHub Actions julkaisee tämän kansion Pagesiin, kun `main`-haaraan lähetetään muutoksia. Sääntökirjojen PDF-tiedostoja ja paikallisia varmuuskopioita ei sisällytetä repositorioon tai sivustoon.

`peli.html` toimii myös suoraan tiedostosta avattavana versiona. PWA-asennus ja automaattiset päivitykset edellyttävät HTTPS-palvelinta tai localhostia.

## Tarkistukset

`npm test` tarkistaa perussäännöt, kaikki 45 kahden tason yhdistelmää sekä hyväksytyn FAQ-työpohjan. AI:n laajemmat testit: `node test-ai.mjs`.

Selaintestien riippuvuudet:

```sh
npm install
npx playwright install chromium
npm run test:pwa
```

`test-pwa.cjs` tarkistaa offline-uudelleenavauksen, tallennuksen, kielet, molemmat käynnistystavat, todellisen AI-työntekijän, Pages-alihakemiston, käyttäjän valitseman päivityksen ja epäonnistuneen päivityksen palautumisen. Muut `test-*-browser.cjs`-testit sekä `test-browser.cjs`, `test-language.cjs` ja `test-drag.cjs` tarkistavat pelin selaintoiminnot. iPad-näkymät testataan Chromiumin laite-emuloinnilla; fyysinen Safari-testaus tehdään iPadilla.

## Tekijät

Epävirallinen selainversio lautapelistä **Baba Is You: The Board Game**. Alkuperäinen pelisuunnittelu: Arvi Teikari / Hempuli ja Peter C. Hayward; lautapelin julkaisija Bitewing Games. Projekti ei ole alkuperäisten tekijöiden virallinen julkaisu.

Kuvake esittää pelin Baba- ja Keke-hahmoja ×-merkin molemmin puolin. Sen muokattava lähde on `assets/icons/icon.svg`. DM Sans- ja Space Grotesk -fontit ovat paikallisia SIL Open Font License -fontteja; lisenssit ovat `assets/fonts/`-kansiossa.
