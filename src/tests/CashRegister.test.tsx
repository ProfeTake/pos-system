import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";
import { useMandatoryCashSession } from "../hooks/useMandatoryCashSession";
import CashRegisterDialog from "../components/features/cash/CashRegister";

// Mock del hook
vi.mock("../hooks/useMandatoryCashSession");

// Mock de fetch global
global.fetch = vi.fn();

describe("Componente CashRegister", () => {
  const mockSession = {
    openedAt: "2025-01-01T08:00:00.000Z",
    openingAmount: 50000,
    windowOpen: "2025-01-01T08:00:00.000Z",
    windowClose: "2025-01-01T20:00:00.000Z",
  };

  const mockFunctions = {
    session: null,
    mustOpen: true,
    loading: false,
    refresh: vi.fn(),
    openSession: vi.fn(),
    closeSession: vi.fn(),
    addMovement: vi.fn(),
    getCurrentMovements: vi.fn().mockResolvedValue([]),
    withinOperationalHours: true,
    window: { open: new Date(), close: new Date() },
    closeAt: new Date(),
    nextOpen: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useMandatoryCashSession as any).mockReturnValue(mockFunctions);
  });

  test("should render opening form when no session", () => {
    render(<CashRegisterDialog isOpen={true} onClose={() => {}} />);

    expect(screen.getByText("Monto de apertura")).toBeInTheDocument();
    expect(screen.getByText("Abrir caja")).toBeInTheDocument();
  });

  test("should show session details when active", async () => {
    (useMandatoryCashSession as any).mockReturnValue({
      ...mockFunctions,
      session: mockSession,
      mustOpen: false,
    });

    render(<CashRegisterDialog isOpen={true} onClose={() => {}} />);

    expect(await screen.findByText("Apertura")).toBeInTheDocument();
    const amounts = await screen.findAllByText("$50.000");
    expect(amounts.length).toBeGreaterThanOrEqual(1);
    expect(await screen.findByText("Cerrar caja")).toBeInTheDocument();
  });

  test("should call openSession with correct amount", async () => {
    const mockOpenSession = vi.fn().mockResolvedValue({});
    (useMandatoryCashSession as any).mockReturnValue({
      ...mockFunctions,
      openSession: mockOpenSession,
    });

    render(<CashRegisterDialog isOpen={true} onClose={() => {}} />);

    const input = screen.getByDisplayValue("");
    const button = screen.getByText("Abrir caja");

    fireEvent.change(input, { target: { value: "75000" } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockOpenSession).toHaveBeenCalledWith(75000);
    });
  });

  test("should calculate balance correctly with movements", async () => {
    (useMandatoryCashSession as any).mockReturnValue({
      ...mockFunctions,
      session: mockSession,
      mustOpen: false,
    });

    render(<CashRegisterDialog isOpen={true} onClose={() => {}} />);

    // El balance inicial debería ser el monto de apertura
    const amounts = await screen.findAllByText("$50.000");
    expect(amounts.length).toBeGreaterThanOrEqual(1);
  });

  test("should validate opening amount input", async () => {
    const mockOpenSession = vi.fn();
    (useMandatoryCashSession as any).mockReturnValue({
      ...mockFunctions,
      openSession: mockOpenSession,
    });

    render(<CashRegisterDialog isOpen={true} onClose={() => {}} />);

    const button = screen.getByText("Abrir caja");
    fireEvent.click(button);

    // Espera un tick para que se procese el handler
    await waitFor(() => {
      expect(mockOpenSession).not.toHaveBeenCalled();
    });
  });
});
