export type TutorProfileDocument = {
  id: string;
  title: string;
  description: string;
  fileName: string;
};

export const TUTOR_PROFILE_DOCUMENTS: TutorProfileDocument[] = [
  {
    id: "umowa-zlecenie",
    title: "Umowa zlecenia (student)",
    description: "Wzór umowy zlecenia — uzupełnij dane i podpisz przed pierwszą wypłatą.",
    fileName: "ZALICZONE_Umowa_Zlecenie_Student.docx",
  },
  {
    id: "pit-0",
    title: "Oświadczenie PIT-0",
    description: "Oświadczenie o braku obowiązku poboru zaliczek (student poniżej 26 lat).",
    fileName: "ZALICZONE_Oswiadczenie_PIT0.pdf",
  },
  {
    id: "ewidencja-wzor",
    title: "Wzór ewidencji godzin",
    description: "Szablon ewidencji do wydruku — w systemie generujesz wersję z danymi w Finanse.",
    fileName: "ZALICZONE_Ewidencja_Godzin.pdf",
  },
  {
    id: "rodo",
    title: "Klauzula informacyjna RODO",
    description: "Informacja o przetwarzaniu danych osobowych korepetytorów.",
    fileName: "ZALICZONE_RODO_Korepetytor.pdf",
  },
];

export function mockDownloadDocument(fileName: string) {
  const blob = new Blob(
    [`Mock pliku: ${fileName}\n\nZALICZONE — dokument ${new Date().toLocaleString("pl-PL")}`],
    { type: "text/plain;charset=utf-8" },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
