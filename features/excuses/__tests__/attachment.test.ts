import { extFromMime, formatFileSize, kindFromMime } from "../attachment";

describe("attachment (justificatif)", () => {
  describe("kindFromMime", () => {
    it("reconnaît une image par le MIME", () => {
      expect(kindFromMime("image/jpeg", "photo.jpg")).toBe("image");
      expect(kindFromMime("image/png", "scan.png")).toBe("image");
    });
    it("reconnaît un PDF par le MIME", () => {
      expect(kindFromMime("application/pdf", "certificat.pdf")).toBe("pdf");
    });
    it("retombe sur l'extension quand le MIME manque", () => {
      expect(kindFromMime(null, "certificat.pdf")).toBe("pdf");
      expect(kindFromMime(undefined, "uid/groupe-123.pdf")).toBe("pdf");
      expect(kindFromMime(null, "uid/groupe-123.jpg")).toBe("image");
    });
  });

  describe("extFromMime", () => {
    it("garde pdf pour un PDF", () => {
      expect(extFromMime("application/pdf", "a.pdf")).toBe("pdf");
      expect(extFromMime(null, "a.pdf")).toBe("pdf");
    });
    it("dérive l'extension du sous-type image", () => {
      expect(extFromMime("image/png", "a.png")).toBe("png");
      expect(extFromMime("image/jpeg", "a.jpg")).toBe("jpeg");
    });
    it("retombe sur jpg si le MIME est inexploitable", () => {
      expect(extFromMime(null, "sans-extension")).toBe("jpg");
      expect(extFromMime("image/", "x")).toBe("jpg");
    });
  });

  describe("formatFileSize", () => {
    it("formate à la française", () => {
      expect(formatFileSize(512)).toBe("512 o");
      expect(formatFileSize(2048)).toBe("2 Ko");
      expect(formatFileSize(1_258_291)).toBe("1,2 Mo");
    });
    it("renvoie vide si la taille est inconnue", () => {
      expect(formatFileSize(null)).toBe("");
      expect(formatFileSize(0)).toBe("");
    });
  });
});
