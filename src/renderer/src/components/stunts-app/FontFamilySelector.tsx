'use client'

export const FontFamilySelector = ({ value, onChange, style }) => {
  return (
    <>
      <select
        id="font_family"
        name="font_family"
        value={value}
        onChange={onChange}
        className="px-2 py-1 border border-gray-300 rounded text-xs"
        style={style}
      >
        <option value="Actor" style={{ fontFamily: 'Actor' }}>
          Actor
        </option>
        <option value="Aladin" style={{ fontFamily: 'Aladin' }}>
          Aladin
        </option>
        <option value="Aleo" style={{ fontFamily: 'Aleo' }}>
          Aleo
        </option>
        <option value="Amiko" style={{ fontFamily: 'Amiko' }}>
          Amiko
        </option>
        <option value="Ballet" style={{ fontFamily: 'Ballet' }}>
          Ballet
        </option>
        <option value="Basic" style={{ fontFamily: 'Basic' }}>
          Basic
        </option>
        <option value="Bungee" style={{ fontFamily: 'Bungee' }}>
          Bungee
        </option>
        <option value="Caramel" style={{ fontFamily: 'Caramel' }}>
          Caramel
        </option>
        <option value="Cherish" style={{ fontFamily: 'Cherish' }}>
          Cherish
        </option>
        <option value="Coda" style={{ fontFamily: 'Coda' }}>
          Coda
        </option>
        <option value="David Libre" style={{ fontFamily: 'David Libre' }}>
          David Libre
        </option>
        <option value="Dorsa" style={{ fontFamily: 'Dorsa' }}>
          Dorsa
        </option>
        <option value="Duru Sans" style={{ fontFamily: 'Duru Sans' }}>
          Duru Sans
        </option>
        <option value="Dynalight" style={{ fontFamily: 'Dynalight' }}>
          Dynalight
        </option>
        <option value="Eater" style={{ fontFamily: 'Eater' }}>
          Eater
        </option>
        <option value="Epilogue" style={{ fontFamily: 'Epilogue' }}>
          Epilogue
        </option>
        <option value="Exo" style={{ fontFamily: 'Exo' }}>
          Exo
        </option>
        <option value="Explora" style={{ fontFamily: 'Explora' }}>
          Explora
        </option>
        <option value="Federo" style={{ fontFamily: 'Federo' }}>
          Federo
        </option>
        <option value="Figtree" style={{ fontFamily: 'Figtree' }}>
          Figtree
        </option>
        <option value="Flavors" style={{ fontFamily: 'Flavors' }}>
          Flavors
        </option>
        <option value="Galada" style={{ fontFamily: 'Galada' }}>
          Galada
        </option>
        <option value="Gantari" style={{ fontFamily: 'Gantari' }}>
          Gantari
        </option>
        <option value="Geo" style={{ fontFamily: 'Geo' }}>
          Geo
        </option>
        <option value="Glory" style={{ fontFamily: 'Glory' }}>
          Glory
        </option>
        <option value="HappyMonkey" style={{ fontFamily: 'HappyMonkey' }}>
          HappyMonkey
        </option>
        <option value="HennyPenny" style={{ fontFamily: 'HennyPenny' }}>
          HennyPenny
        </option>
        <option value="Iceberg" style={{ fontFamily: 'Iceberg' }}>
          Iceberg
        </option>
        <option value="Inika" style={{ fontFamily: 'Inika' }}>
          Inika
        </option>
        <option value="InriaSans" style={{ fontFamily: 'InriaSans' }}>
          InriaSans
        </option>
        <option value="Jaro" style={{ fontFamily: 'Jaro' }}>
          Jaro
        </option>
        <option value="Kavoon" style={{ fontFamily: 'Kavoon' }}>
          Kavoon
        </option>
        <option value="Khula" style={{ fontFamily: 'Khula' }}>
          Khula
        </option>
        <option value="Kokoro" style={{ fontFamily: 'Kokoro' }}>
          Kokoro
        </option>
        <option value="Lemon" style={{ fontFamily: 'Lemon' }}>
          Lemon
        </option>
        <option value="Lexend" style={{ fontFamily: 'Lexend' }}>
          Lexend
        </option>
        <option value="Macondo" style={{ fontFamily: 'Macondo' }}>
          Macondo
        </option>
        <option value="Maitree" style={{ fontFamily: 'Maitree' }}>
          Maitree
        </option>
        <option value="Martel" style={{ fontFamily: 'Martel' }}>
          Martel
        </option>
        <option value="Maven Pro" style={{ fontFamily: 'Maven Pro' }}>
          Maven Pro
        </option>
        <option value="Neuton" style={{ fontFamily: 'Neuton' }}>
          Neuton
        </option>
        <option value="News Cycle" style={{ fontFamily: 'News Cycle' }}>
          News Cycle
        </option>
        <option value="Nixie One" style={{ fontFamily: 'Nixie One' }}>
          Nixie One
        </option>
        <option value="Overlock" style={{ fontFamily: 'Overlock' }}>
          Overlock
        </option>
        <option value="Oxygen" style={{ fontFamily: 'Oxygen' }}>
          Oxygen
        </option>
        <option value="Play" style={{ fontFamily: 'Play' }}>
          Play
        </option>
        <option value="Quicksand" style={{ fontFamily: 'Quicksand' }}>
          Quicksand
        </option>
        <option value="Radley" style={{ fontFamily: 'Radley' }}>
          Radley
        </option>
        <option value="Rethink Sans" style={{ fontFamily: 'Rethink Sans' }}>
          Rethink Sans
        </option>
        <option value="Rosario" style={{ fontFamily: 'Rosario' }}>
          Rosario
        </option>
        <option value="Sacramento" style={{ fontFamily: 'Sacramento' }}>
          Sacramento
        </option>
        <option value="Salsa" style={{ fontFamily: 'Salsa' }}>
          Salsa
        </option>
        <option value="Scope One" style={{ fontFamily: 'Scope One' }}>
          Scope One
        </option>
        <option value="Teachers" style={{ fontFamily: 'Teachers' }}>
          Teachers
        </option>
        <option value="Underdog" style={{ fontFamily: 'Underdog' }}>
          Underdog
        </option>
        <option value="Vibes" style={{ fontFamily: 'Vibes' }}>
          Vibes
        </option>
        <option value="Vina Sans" style={{ fontFamily: 'Vina Sans' }}>
          Vina Sans
        </option>
        <option value="Water Brush" style={{ fontFamily: 'Water Brush' }}>
          Water Brush
        </option>
        <option value="Wind Song" style={{ fontFamily: 'Wind Song' }}>
          Wind Song
        </option>
        <option value="Zain" style={{ fontFamily: 'Zain' }}>
          Zain
        </option>
      </select>
    </>
  )
}
