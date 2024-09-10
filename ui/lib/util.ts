const colorLevels = ["700", "800", "900", "1000"];

const colorPalettes = {
  gray: {
    700: [143, 143, 143],
    800: [125, 125, 125],
    900: [102, 102, 102],
    1000: [23, 23, 23],
  },
  blue: {
    700: [0, 122, 255],
    800: [0, 104, 218],
    900: [0, 107, 214],
    1000: [0, 38, 77],
  },
  amber: {
    700: [255, 170, 51],
    800: [255, 136, 0],
    900: [163, 82, 0],
    1000: [77, 35, 0],
  },
  red: {
    700: [230, 102, 102],
    800: [204, 77, 77],
    900: [189, 71, 71],
    1000: [77, 19, 19],
  },
  green: {
    700: [51, 204, 51],
    800: [41, 173, 41],
    900: [31, 163, 31],
    1000: [20, 77, 20],
  },
  teal: {
    700: [0, 184, 153],
    800: [0, 153, 128],
    900: [0, 128, 107],
    1000: [0, 66, 55],
  },
  purple: {
    700: [138, 66, 255],
    800: [115, 55, 212],
    900: [110, 0, 219],
    1000: [38, 0, 77],
  },
  pink: {
    700: [255, 77, 136],
    800: [255, 0, 102],
    900: [230, 0, 92],
    1000: [77, 0, 31],
  },
};

export const getRandomColor = () => {
  const paletteKeys = Object.keys(colorPalettes) as Array<keyof typeof colorPalettes>;
  const randomPalette = paletteKeys[Math.floor(Math.random() * paletteKeys.length)];
  const randomLevel = colorLevels[
    Math.floor(Math.random() * colorLevels.length)
  ] as unknown as keyof (typeof colorPalettes)[typeof randomPalette];
  const [r, g, b] = colorPalettes[randomPalette][randomLevel];
  return `rgb(${r}, ${g}, ${b})`;
};
