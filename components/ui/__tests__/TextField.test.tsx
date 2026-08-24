import { fireEvent, render, screen } from "@testing-library/react-native";

import { TextField } from "../TextField";

describe("TextField", () => {
  it("affiche le label et le message d'erreur", () => {
    render(<TextField label="E-mail" error="Email invalide" value="" onChangeText={() => {}} />);
    expect(screen.getByText("E-mail")).toBeTruthy();
    expect(screen.getByText("Email invalide")).toBeTruthy();
  });

  it("masque le mot de passe par défaut et bascule l'affichage", () => {
    render(<TextField secureTextEntry value="secret" onChangeText={() => {}} />);

    // Masqué au départ → bouton « Afficher »
    const show = screen.getByLabelText("Afficher le mot de passe");
    expect(show).toBeTruthy();

    fireEvent.press(show);

    // Devient « Masquer »
    expect(screen.getByLabelText("Masquer le mot de passe")).toBeTruthy();
  });

  it("ne montre pas d'œil pour un champ non-password", () => {
    render(<TextField label="E-mail" value="" onChangeText={() => {}} />);
    expect(screen.queryByLabelText("Afficher le mot de passe")).toBeNull();
  });
});
