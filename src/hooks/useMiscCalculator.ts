import { useState, useCallback, useRef } from "react";

interface UseMiscCalculatorReturn {
    // State
    miscItems: number[];
    miscDraft: string;
    miscDraftList: number[];
    miscAddSeparate: boolean;
    miscTotal: number;

    // Actions
    setMiscDraft: (value: string) => void;
    setMiscAddSeparate: (value: boolean) => void;
    addMiscItem: () => void;
    removeMiscItem: (index: number) => void;
    clearMiscItems: () => void;
    evaluateExpression: (expr: string) => number | null;

    // Refs
    miscInputRef: React.RefObject<HTMLInputElement | null>;
}

/**
 * Custom hook for miscellaneous sales calculator
 * Supports mathematical expressions with +, -, *, /, parentheses
 * Handles 'x' as multiplication and commas as thousands separators
 */
export function useMiscCalculator(): UseMiscCalculatorReturn {
    const [miscItems, setMiscItems] = useState<number[]>([]);
    const [miscDraft, setMiscDraft] = useState<string>("");
    const [miscDraftList, setMiscDraftList] = useState<number[]>([]);
    const [miscAddSeparate, setMiscAddSeparate] = useState(false);
    const miscInputRef = useRef<HTMLInputElement | null>(null);

    /**
     * Evaluates a mathematical expression safely
     * Supports: +, -, *, /, parentheses, 'x' for multiplication
     */
    const evaluateExpression = useCallback((expr: string): number | null => {
        try {
            if (!expr) return null;

            // Normalize: remove spaces, replace 'x' with '*', remove commas
            let s = String(expr)
                .replace(/\s+/g, "")
                .replace(/x/gi, "*")
                .replace(/,/g, "");

            // Tokenize
            const tokens: string[] = [];
            let num = "";

            for (let i = 0; i < s.length; i++) {
                const c = s[i];
                if (/[0-9.]/.test(c)) {
                    num += c;
                } else {
                    if (num) {
                        tokens.push(num);
                        num = "";
                    }
                    tokens.push(c);
                }
            }
            if (num) tokens.push(num);

            // Shunting yard algorithm for infix to postfix
            const output: string[] = [];
            const operators: string[] = [];
            const precedence: Record<string, number> = { "+": 1, "-": 1, "*": 2, "/": 2 };

            for (const token of tokens) {
                if (!isNaN(Number(token))) {
                    output.push(token);
                } else if (token in precedence) {
                    while (
                        operators.length &&
                        operators[operators.length - 1] !== "(" &&
                        precedence[operators[operators.length - 1]] >= precedence[token]
                    ) {
                        output.push(operators.pop()!);
                    }
                    operators.push(token);
                } else if (token === "(") {
                    operators.push(token);
                } else if (token === ")") {
                    while (operators.length && operators[operators.length - 1] !== "(") {
                        output.push(operators.pop()!);
                    }
                    operators.pop(); // Remove '('
                }
            }

            while (operators.length) {
                output.push(operators.pop()!);
            }

            // Evaluate postfix
            const stack: number[] = [];
            for (const token of output) {
                if (!isNaN(Number(token))) {
                    stack.push(Number(token));
                } else {
                    if (stack.length < 2) return null;
                    const b = stack.pop()!;
                    const a = stack.pop()!;
                    let r: number;

                    switch (token) {
                        case "+":
                            r = a + b;
                            break;
                        case "-":
                            r = a - b;
                            break;
                        case "*":
                            r = a * b;
                            break;
                        case "/":
                            r = a / b;
                            break;
                        default:
                            return null;
                    }
                    stack.push(r);
                }
            }

            if (stack.length !== 1) return null;
            return stack[0];
        } catch {
            return null;
        }
    }, []);

    const addMiscItem = useCallback(() => {
        const result = evaluateExpression(miscDraft);
        if (result !== null && result > 0) {
            if (miscAddSeparate) {
                // Add each term as separate line
                const terms = miscDraft.split(/[+]/).map((t) => t.trim());
                const values = terms
                    .map((t) => evaluateExpression(t))
                    .filter((v): v is number => v !== null && v > 0);

                setMiscDraftList((prev) => [...prev, ...values]);
            } else {
                // Add total as single line
                setMiscDraftList((prev) => [...prev, result]);
            }
            setMiscDraft("");
            miscInputRef.current?.focus();
        }
    }, [miscDraft, miscAddSeparate, evaluateExpression]);

    const removeMiscItem = useCallback((index: number) => {
        setMiscDraftList((prev) => prev.filter((_, i) => i !== index));
    }, []);

    const clearMiscItems = useCallback(() => {
        setMiscItems([]);
        setMiscDraft("");
        setMiscDraftList([]);
    }, []);

    const miscTotal = miscItems.reduce((sum, n) => sum + (Number(n) || 0), 0);

    return {
        miscItems,
        miscDraft,
        miscDraftList,
        miscAddSeparate,
        miscTotal,
        setMiscDraft,
        setMiscAddSeparate,
        addMiscItem,
        removeMiscItem,
        clearMiscItems,
        evaluateExpression,
        miscInputRef,
    };
}
