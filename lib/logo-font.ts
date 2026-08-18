import { Poppins } from "next/font/google";

/** Logotyp - kursywa, zwarte śledzenie (jak w makiecie) */
export const logoFont = Poppins({
  subsets: ["latin", "latin-ext"],
  weight: ["700", "800"],
  style: ["normal", "italic"],
  display: "swap",
});
