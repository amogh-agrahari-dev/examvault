import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Play, Pause, SkipBack, SkipForward, ChevronLeft, ChevronRight,
  Maximize2, Minimize2, X, Terminal, Sparkles, Bot, AlertCircle,
  CheckCircle2, RefreshCw, Cpu, Layers, HelpCircle, Code2, ArrowDown,
  ArrowUp, Activity, Check, Copy, Flame
} from "lucide-react";
import { simulateCode } from "../services/api";
import { highlightCodeToReact } from "../utils/codeHighlighter";

// Preset algorithms students can load instantly for simulation
export const PRESET_ALGORITHMS = [
  {
    name: "Fibonacci Search (C++)",
    language: "cpp",
    code: `// Fibonacci Search Algorithm (C++)
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int fibonacciSearch(const vector<int>& arr, int target) {
    int n = arr.size();
    int offset = -1;
    int fm2 = 0;              // (m-2)'th Fibonacci number
    int fm1 = 1;              // (m-1)'th Fibonacci number
    int fm = fm1 + fm2;       // m'th Fibonacci number

    while (fm < n) {
        fm2 = fm1;
        fm1 = fm;
        fm = fm1 + fm2;
    }

    while (fm > 1) {
        int i = min(offset + fm2, n - 1);
        if (arr[i] < target) {
            fm = fm1;
            fm1 = fm2;
            fm2 = fm - fm1;
            offset = i;
        } else if (arr[i] > target) {
            fm = fm2;
            fm1 = fm1 - fm2;
            fm2 = fm - fm1;
        } else {
            return i; // Target found
        }
    }

    if (fm1 && offset + 1 < n && arr[offset + 1] == target) {
        return offset + 1;
    }

    return -1; // Target not found
}

int main() {
    vector<int> arr = {2, 5, 8, 12, 16, 23, 38, 56, 72, 91};
    int target = 23;
    int index = fibonacciSearch(arr, target);
    cout << "Target " << target << " found at index: " << index << endl;
    return 0;
}`
  },
  {
    name: "Merge Sort (C++)",
    language: "cpp",
    code: `void Merge_Sort(int A[], int low, int high, int n)
{
    if (low >= high)
        return;
    int mid = (low + high) / 2;
    Merge_Sort(A, low, mid, n);
    Merge_Sort(A, mid + 1, high, n);
    Merge(A, low, mid, high, n);
}

void Merge(int A[], int low, int mid, int high, int n)
{
    int B[100];
    int i = low, j = mid + 1, k = low;
    while (i <= mid && j <= high)
    {
        if (A[i] <= A[j])
            B[k++] = A[i++];
        else
            B[k++] = A[j++];
    }
    while (i <= mid)
        B[k++] = A[i++];
    while (j <= high)
        B[k++] = A[j++];
    for (i = low; i <= high; i++)
        A[i] = B[i];
}`
  },
  {
    name: "Quick Sort (C++)",
    language: "cpp",
    code: `void quickSort(int arr[], int low, int high) {
    if (low >= high) return;
    int i = low;
    int j = high;
    int pivot = arr[(low + high) / 2];
    while (i <= j) {
        while (arr[i] < pivot) i++;
        while (arr[j] > pivot) j--;
        if (i <= j) {
            int temp = arr[i];
            arr[i] = arr[j];
            arr[j] = temp;
            i++;
            j--;
        }
    }
    if (low < j) quickSort(arr, low, j);
    if (i < high) quickSort(arr, i, high);
}`
  },
  {
    name: "Binary Search",
    language: "python",
    code: `arr = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91]
target = 23
left = 0
right = len(arr) - 1
found = -1

while left <= right:
    mid = (left + right) // 2
    if arr[mid] == target:
        found = mid
        break
    elif arr[mid] < target:
        left = mid + 1
    else:
        right = mid - 1

print(f"Target {target} located at index {found}")`
  },
  {
    name: "Two Pointers (Pair Sum)",
    language: "python",
    code: `arr = [1, 2, 4, 6, 8, 11, 15]
target_sum = 10
left = 0
right = len(arr) - 1
pair = None

while left < right:
    current_sum = arr[left] + arr[right]
    if current_sum == target_sum:
        pair = (arr[left], arr[right])
        break
    elif current_sum < target_sum:
        left += 1
    else:
        right -= 1

print(f"Found pair {pair} with sum {target_sum}")`
  },
  {
    name: "Bubble Sort",
    language: "python",
    code: `arr = [29, 10, 14, 37, 13]
n = len(arr)

for i in range(n):
    for j in range(0, n - i - 1):
        if arr[j] > arr[j + 1]:
            arr[j], arr[j + 1] = arr[j + 1], arr[j]

print("Sorted array:", arr)`
  },
  {
    name: "Linear Search",
    language: "python",
    code: `arr = [15, 8, 42, 23, 4, 16]
target = 23
found_idx = -1

for i in range(len(arr)):
    if arr[i] == target:
        found_idx = i
        break

print(f"Found {target} at index {found_idx}")`
  }
];

// Fallback client-side algorithm trace generator if offline or while loading
export function generateClientFallbackTrace(code, language = "cpp") {
  const lines = (code || "").splitlines ? code.splitlines() : (code || "").split("\n");
  const codeLines = lines.map((text, idx) => ({ line_number: idx + 1, text }));
  const codeStr = (code || "").toLowerCase();

  // 0. Fibonacci Search (C, C++, Java, Python)
  const isFibonacci =
    (codeStr.includes("fm") && (codeStr.includes("offset") || codeStr.includes("fm1") || codeStr.includes("fm2"))) ||
    codeStr.includes("fibonacci");

  if (isFibonacci) {
    let arr = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91];
    const cppArrMatch = (code || "").match(/=\s*\{([^}]+)\}/);
    if (cppArrMatch) {
      const parsed = cppArrMatch[1].match(/-?\d+/g);
      if (parsed && parsed.length > 0) arr = parsed.map(Number);
    }
    let target = 23;
    const targetMatch = (code || "").match(/target\s*=\s*(-?\d+)/i);
    if (targetMatch) {
      target = parseInt(targetMatch[1], 10);
    }

    const n = arr.length;
    const A = [...arr];
    const steps = [];
    let stepCount = 1;

    const findLine = (kw, defaultLine = 1) => {
      const idx = lines.findIndex((l) => l.toLowerCase().includes(kw.toLowerCase()));
      return idx !== -1 ? idx + 1 : defaultLine;
    };

    const lineInitVars = findLine("offset", 3);
    const lineFibGrow = findLine("while(fm<", 8);
    const lineCalcI = findLine("min(offset", 15);
    const lineLess = findLine("< target", 16);
    const lineGreater = findLine("> target", 21);
    const lineFound = findLine("return i", 26);
    const lineLastCheck = findLine("offset + 1", lines.length);

    let offset = -1;
    let fm2 = 0;
    let fm1 = 1;
    let fm = fm1 + fm2;

    steps.push({
      step: stepCount++,
      line: lineInitVars,
      code_line: lines[lineInitVars - 1] || "int offset = -1; int fm2 = 0; int fm1 = 1; int fm = fm1 + fm2;",
      explanation: `Fibonacci Search initialized on sorted array of ${n} elements: [${A.join(", ")}]. Target = ${target}.`,
      variables: { offset, fm, fm1, fm2, target, n, arr: [...A] },
      pointers: { offset: 0 },
      highlights: [0, n - 1],
      dimmed: [],
      stdout: `Initial Array: [${A.join(", ")}]\nTarget: ${target}\n`
    });

    while (fm < n) {
      fm2 = fm1;
      fm1 = fm;
      fm = fm1 + fm2;
    }

    steps.push({
      step: stepCount++,
      line: lineFibGrow,
      code_line: lines[lineFibGrow - 1] || "while (fm < n) { fm2 = fm1; fm1 = fm; fm = fm1 + fm2; }",
      explanation: `Computed smallest Fibonacci number >= ${n}: Fm = ${fm} (with Fm1 = ${fm1}, Fm2 = ${fm2}).`,
      variables: { offset, fm, fm1, fm2, n, target },
      pointers: { offset: 0 },
      highlights: [],
      dimmed: [],
      stdout: `Fibonacci bounds: Fm=${fm}, Fm1=${fm1}, Fm2=${fm2}\n`
    });

    let foundIdx = -1;

    while (fm > 1) {
      const i = Math.min(offset + fm2, n - 1);
      const minValid = Math.max(0, offset + 1);
      const maxValid = Math.min(n - 1, offset + fm);
      const dimmed = [];
      for (let idx = 0; idx < n; idx++) {
        if (idx < minValid || idx > maxValid) dimmed.push(idx);
      }

      steps.push({
        step: stepCount++,
        line: lineCalcI,
        code_line: lines[lineCalcI - 1] || `int i = min(offset + fm2, n - 1); // i = ${i}`,
        explanation: `Calculated probe index i = min(offset + fm2, n - 1) = ${i}. Element arr[${i}] = ${A[i]}.`,
        variables: { offset, fm, fm1, fm2, i, "arr[i]": A[i], target },
        pointers: { offset: Math.max(0, offset), i },
        highlights: [i],
        dimmed,
        stdout: ""
      });

      if (A[i] < target) {
        steps.push({
          step: stepCount++,
          line: lineLess,
          code_line: lines[lineLess - 1] || "else if (arr[i] < target)",
          explanation: `arr[${i}] (${A[i]}) < target (${target}). Target lies in right partition. Shifting offset to ${i}. Decrementing Fibonacci triplet by 1 step: Fm=${fm1}, Fm1=${fm2}, Fm2=${fm1 - fm2}.`,
          variables: { offset: i, fm: fm1, fm1: fm2, fm2: fm1 - fm2, i, "arr[i]": A[i], target },
          pointers: { offset: i, i },
          highlights: [i],
          dimmed: Array.from({ length: i + 1 }, (_, k) => k),
          stdout: `arr[${i}] (${A[i]}) < ${target} -> Discarding left range up to ${i}\n`
        });
        fm = fm1;
        fm1 = fm2;
        fm2 = fm - fm1;
        offset = i;
      } else if (A[i] > target) {
        steps.push({
          step: stepCount++,
          line: lineGreater,
          code_line: lines[lineGreater - 1] || "else if (arr[i] > target)",
          explanation: `arr[${i}] (${A[i]}) > target (${target}). Target lies in left partition. Retaining offset at ${offset}. Decrementing Fibonacci triplet by 2 steps: Fm=${fm2}, Fm1=${fm1 - fm2}, Fm2=${fm2 - (fm1 - fm2)}.`,
          variables: { offset, fm: fm2, fm1: fm1 - fm2, fm2: fm2 - (fm1 - fm2), i, "arr[i]": A[i], target },
          pointers: { offset: Math.max(0, offset), i },
          highlights: [i],
          dimmed: Array.from({ length: n - i }, (_, k) => i + k),
          stdout: `arr[${i}] (${A[i]}) > ${target} -> Discarding right range from ${i}\n`
        });
        fm = fm2;
        fm1 = fm1 - fm2;
        fm2 = fm - fm1;
      } else {
        foundIdx = i;
        steps.push({
          step: stepCount++,
          line: lineFound,
          code_line: lines[lineFound - 1] || "return i;",
          explanation: `Match Found! arr[${i}] (${A[i]}) == target (${target}). Target found at index ${i}!`,
          variables: { found: i, i, offset, "arr[i]": A[i], target },
          pointers: { found: i, i },
          highlights: [i],
          dimmed: Array.from({ length: n }, (_, k) => k).filter((k) => k !== i),
          stdout: `Match Found! Target ${target} is at index ${i}\n`
        });
        break;
      }
    }

    if (foundIdx === -1 && fm1 === 1 && offset + 1 < n && A[offset + 1] === target) {
      foundIdx = offset + 1;
      steps.push({
        step: stepCount++,
        line: lineLastCheck,
        code_line: lines[lineLastCheck - 1] || "if (fm1 && arr[offset + 1] == target) return offset + 1;",
        explanation: `Checking final candidate arr[${offset + 1}] (${A[offset + 1]}) == target (${target}). Match found at index ${offset + 1}!`,
        variables: { found: foundIdx, target, offset },
        pointers: { found: foundIdx },
        highlights: [foundIdx],
        dimmed: Array.from({ length: n }, (_, k) => k).filter((k) => k !== foundIdx),
        stdout: `Match Found! Target ${target} is at index ${foundIdx}\n`
      });
    }

    if (foundIdx !== -1) {
      steps.push({
        step: stepCount++,
        line: lines.length,
        code_line: `return ${foundIdx}; // Target found`,
        explanation: `Fibonacci Search completed! Successfully found target ${target} at index ${foundIdx} using non-division logarithmic comparisons.`,
        variables: { found: foundIdx, target, total_steps: stepCount - 1 },
        pointers: { found: foundIdx },
        highlights: [foundIdx],
        dimmed: [],
        stdout: `Final Result: Target ${target} found at index ${foundIdx}\n`
      });
    }

    return {
      algorithm_name: "Fibonacci Search",
      summary: "Efficient divide-and-conquer search algorithm using Fibonacci numbers to partition a sorted array without division operations.",
      time_complexity: "O(log n)",
      space_complexity: "O(1)",
      category: "Searching",
      key_takeaways: [
        "Partitions the array into unequal intervals using Fibonacci numbers (Fm-1 and Fm-2).",
        "Uses only addition and subtraction operations — zero hardware-expensive division operations.",
        "Optimal for embedded, low-power, and hardware-constrained systems.",
        "Requires the input array to be sorted."
      ],
      language,
      code,
      lines: codeLines,
      data_structure: { type: "array", name: "arr", values: A },
      steps,
      stdout: `Target ${target} ${foundIdx !== -1 ? "found at index " + foundIdx : "not found"}\n`,
      ai_powered: false
    };
  }

  // 1. Merge Sort Algorithm (C, C++, Java, Python)
  if (
    codeStr.includes("merge_sort") ||
    codeStr.includes("mergesort") ||
    codeStr.includes("void merge") ||
    codeStr.includes("void merge_sort")
  ) {
    const arr = [38, 27, 43, 3, 9, 82, 10];
    const n = arr.length;
    const A = [...arr];
    const steps = [];
    let stepCount = 1;

    const findLine = (kw, defaultLine = 1) => {
      const idx = lines.findIndex((l) => l.toLowerCase().includes(kw.toLowerCase()));
      return idx !== -1 ? idx + 1 : defaultLine;
    };

    const lineMergeSort = findLine("merge_sort(", 1);
    const lineMid = findLine("(low + high)", 5);
    const lineMerge = findLine("void merge", 11);
    const lineComp = findLine("b[k++] = a[i++", 18);
    const lineCopy = findLine("a[i] = b[i]", 27);

    steps.push({
      step: stepCount++,
      line: lineMergeSort,
      code_line: lines[lineMergeSort - 1] || "void Merge_Sort(int A[], int low, int high, int n)",
      explanation: `Starting Merge Sort on array A with ${n} elements: [${A.join(", ")}]. Range [low=0 to high=${n - 1}].`,
      variables: { low: 0, high: n - 1, n, A: [...A] },
      pointers: { low: 0, high: n - 1 },
      highlights: [0, n - 1],
      dimmed: [],
      stdout: `Initial Array A: [${A.join(", ")}]\n`
    });

    const merge = (low, mid, high) => {
      const B = new Array(n);
      let i = low;
      let j = mid + 1;
      let k = low;
      const dimmed = [];
      for (let idx = 0; idx < n; idx++) {
        if (idx < low || idx > high) dimmed.push(idx);
      }

      steps.push({
        step: stepCount++,
        line: lineMerge,
        code_line: lines[lineMerge - 1] || "void Merge(...)",
        explanation: `Merging sorted intervals: Left [${low}..${mid}] (${A.slice(low, mid + 1).join(", ")}) and Right [${mid + 1}..${high}] (${A.slice(mid + 1, high + 1).join(", ")}).`,
        variables: { low, mid, high, i, j, k, A: [...A] },
        pointers: { low, mid, high, i, j },
        highlights: [i, Math.min(j, n - 1)],
        dimmed,
        stdout: ""
      });

      while (i <= mid && j <= high) {
        if (A[i] <= A[j]) {
          B[k] = A[i];
          steps.push({
            step: stepCount++,
            line: lineComp,
            code_line: "B[k++] = A[i++];",
            explanation: `Comparing A[${i}] (${A[i]}) <= A[${j}] (${A[j]}) -> True. Storing A[${i}] (${A[i]}) into buffer B[${k}].`,
            variables: { low, mid, high, i, j, k, "A[i]": A[i], "A[j]": A[j], A: [...A] },
            pointers: { i, j, k },
            highlights: [i, j],
            dimmed,
            stdout: ""
          });
          i++;
          k++;
        } else {
          B[k] = A[j];
          steps.push({
            step: stepCount++,
            line: lineComp,
            code_line: "B[k++] = A[j++];",
            explanation: `Comparing A[${i}] (${A[i]}) <= A[${j}] (${A[j]}) -> False. Storing smaller element A[${j}] (${A[j]}) into B[${k}].`,
            variables: { low, mid, high, i, j, k, "A[i]": A[i], "A[j]": A[j], A: [...A] },
            pointers: { i, j, k },
            highlights: [i, j],
            dimmed,
            stdout: ""
          });
          j++;
          k++;
        }
      }

      while (i <= mid) {
        B[k] = A[i];
        steps.push({
          step: stepCount++,
          line: lineComp,
          code_line: "B[k++] = A[i++];",
          explanation: `Copying remaining left element A[${i}] (${A[i]}) into B[${k}].`,
          variables: { i, k, A: [...A] },
          pointers: { i, k },
          highlights: [i],
          dimmed,
          stdout: ""
        });
        i++;
        k++;
      }

      while (j <= high) {
        B[k] = A[j];
        steps.push({
          step: stepCount++,
          line: lineComp,
          code_line: "B[k++] = A[j++];",
          explanation: `Copying remaining right element A[${j}] (${A[j]}) into B[${k}].`,
          variables: { j, k, A: [...A] },
          pointers: { j, k },
          highlights: [j],
          dimmed,
          stdout: ""
        });
        j++;
        k++;
      }

      for (let idx = low; idx <= high; idx++) {
        A[idx] = B[idx];
      }

      const mergedRange = [];
      for (let idx = low; idx <= high; idx++) mergedRange.push(idx);

      steps.push({
        step: stepCount++,
        line: lineCopy,
        code_line: "A[i] = B[i];",
        explanation: `Merged range [${low}..${high}]: [${A.slice(low, high + 1).join(", ")}] copied back into array A.`,
        variables: { low, high, A: [...A] },
        pointers: { low, high },
        highlights: mergedRange,
        dimmed,
        stdout: `Merged range [${low}..${high}]: [${A.slice(low, high + 1).join(", ")}]\n`
      });
    };

    const mergeSort = (low, high) => {
      if (low >= high) return;
      const mid = Math.floor((low + high) / 2);

      const dimmed = [];
      for (let idx = 0; idx < n; idx++) {
        if (idx < low || idx > high) dimmed.push(idx);
      }

      steps.push({
        step: stepCount++,
        line: lineMid,
        code_line: lines[lineMid - 1] || "int mid = (low + high) / 2;",
        explanation: `Dividing range [${low}..${high}] at midpoint mid=${mid}. Subarrays: Left [${low}..${mid}], Right [${mid + 1}..${high}].`,
        variables: { low, mid, high, A: [...A] },
        pointers: { low, mid, high },
        highlights: [mid],
        dimmed,
        stdout: ""
      });

      mergeSort(low, mid);
      mergeSort(mid + 1, high);
      merge(low, mid, high);
    };

    mergeSort(0, n - 1);

    const allIndices = [];
    for (let idx = 0; idx < n; idx++) allIndices.push(idx);

    steps.push({
      step: stepCount++,
      line: lines.length,
      code_line: "Merge Sort Complete",
      explanation: `Merge Sort complete! Array A is now completely sorted in ascending order: [${A.join(", ")}].`,
      variables: { A: [...A] },
      pointers: {},
      highlights: allIndices,
      dimmed: [],
      stdout: `Final Sorted Array: [${A.join(", ")}]\n`
    });

    return {
      algorithm_name: "Merge Sort",
      summary: "Classic divide-and-conquer sorting algorithm that divides intervals in half and merges sorted halves in linear time.",
      time_complexity: "O(n log n)",
      space_complexity: "O(n)",
      category: "Sorting",
      key_takeaways: [
        "Guaranteed O(n log n) time complexity across best, average, and worst cases.",
        "Stable sorting algorithm that preserves the relative order of duplicate elements.",
        "Requires O(n) temporary buffer space."
      ],
      language,
      code,
      lines: codeLines,
      data_structure: { type: "array", name: "A", values: arr },
      steps,
      stdout: `Initial Array A: [${arr.join(", ")}]\nSorted Array A: [${A.join(", ")}]\n`,
      ai_powered: false
    };
  }

  // 1.5 Quick Sort Algorithm (C, C++, Java, Python)
  if (
    codeStr.includes("quicksort") ||
    codeStr.includes("quick_sort") ||
    codeStr.includes("void quicksort") ||
    codeStr.includes("void quick_sort")
  ) {
    const arrInput = [35, 12, 49, 18, 77, 60, 23];
    const arr = [...arrInput];
    const n = arr.length;
    const steps = [];
    let stepCount = 1;

    const findLine = (kw, defaultLine = 1) => {
      const idx = lines.findIndex((l) => l.toLowerCase().includes(kw.toLowerCase()));
      return idx !== -1 ? idx + 1 : defaultLine;
    };

    const lineDef = findLine("quicksort(", 1);
    const linePivot = findLine("pivot = arr[", 5);
    const lineWhileIJ = findLine("while (i <= j)", 6);
    const lineIncI = findLine("arr[i] < pivot", 7);
    const lineDecJ = findLine("arr[j] > pivot", 8);
    const lineSwap = findLine("arr[i] = arr[j]", 11);

    steps.push({
      step: stepCount++,
      line: lineDef,
      code_line: lines[lineDef - 1] || "void quickSort(int arr[], int low, int high)",
      explanation: `Initial unsorted array arr = [${arr.join(", ")}] with ${n} elements. Starting Quick Sort on range [low=0 to high=${n - 1}].`,
      variables: { low: 0, high: n - 1, arr: [...arr] },
      pointers: { low: 0, high: n - 1 },
      highlights: [0, n - 1],
      dimmed: [],
      stdout: `Initial Array: [${arr.join(", ")}]\n`
    });

    const quickSort = (low, high) => {
      if (low >= high) return;
      let i = low;
      let j = high;
      let midIdx = Math.floor((low + high) / 2);
      const pivot = arr[midIdx];

      const dimmed = [];
      for (let idx = 0; idx < n; idx++) {
        if (idx < low || idx > high) dimmed.push(idx);
      }

      steps.push({
        step: stepCount++,
        line: linePivot,
        code_line: lines[linePivot - 1] || "int pivot = arr[(low + high) / 2];",
        explanation: `Chosen pivot = arr[${midIdx}] (${pivot}) at midpoint index ${midIdx}. Initializing pointers i=${low}, j=${high}.`,
        variables: { low, high, i, j, pivot, arr: [...arr] },
        pointers: { low, high, i, j, pivot: midIdx },
        highlights: [midIdx],
        dimmed,
        stdout: ""
      });

      while (i <= j) {
        while (arr[i] < pivot) {
          steps.push({
            step: stepCount++,
            line: lineIncI,
            code_line: lines[lineIncI - 1] || "while (arr[i] < pivot) i++;",
            explanation: `arr[${i}] (${arr[i]}) < pivot (${pivot}). Element is already on correct left partition. Advancing pointer i to ${i + 1}.`,
            variables: { i: i + 1, j, pivot, arr: [...arr] },
            pointers: { i: i + 1, j, pivot: midIdx },
            highlights: [i, midIdx],
            dimmed,
            stdout: ""
          });
          i++;
        }

        while (arr[j] > pivot) {
          steps.push({
            step: stepCount++,
            line: lineDecJ,
            code_line: lines[lineDecJ - 1] || "while (arr[j] > pivot) j--;",
            explanation: `arr[${j}] (${arr[j]}) > pivot (${pivot}). Element is already on correct right partition. Decrementing pointer j to ${j - 1}.`,
            variables: { i, j: j - 1, pivot, arr: [...arr] },
            pointers: { i, j: j - 1, pivot: midIdx },
            highlights: [j, midIdx],
            dimmed,
            stdout: ""
          });
          j--;
        }

        if (i <= j) {
          if (i !== j) {
            steps.push({
              step: stepCount++,
              line: lineSwap,
              code_line: lines[lineSwap - 1] || "int temp = arr[i]; arr[i] = arr[j]; arr[j] = temp;",
              explanation: `Swapping arr[${i}] (${arr[i]}) and arr[${j}] (${arr[j]}) to satisfy partition invariant.`,
              variables: { i, j, pivot, "arr[i]": arr[j], "arr[j]": arr[i], arr: [...arr] },
              pointers: { i, j, pivot: midIdx },
              highlights: [i, j],
              dimmed,
              stdout: `Swapped arr[${i}] (${arr[i]}) with arr[${j}] (${arr[j]})\n`
            });

            const temp = arr[i];
            arr[i] = arr[j];
            arr[j] = temp;

            if (midIdx === i) midIdx = j;
            else if (midIdx === j) midIdx = i;
          }
          i++;
          j--;
        }
      }

      steps.push({
        step: stepCount++,
        line: lineWhileIJ,
        code_line: lines[lineWhileIJ - 1] || "while (i <= j)",
        explanation: `Partitioning complete for range [${low}..${high}]. Pointers crossed (i=${i}, j=${j}). Subarrays ready for recursion: left [${low}..${j}] and right [${i}..${high}].`,
        variables: { low, high, i, j, arr: [...arr] },
        pointers: { low, high, j: Math.max(0, Math.min(j, n - 1)), i: Math.max(0, Math.min(i, n - 1)) },
        highlights: j >= 0 && j < n && i >= 0 && i < n ? [j, i] : [],
        dimmed,
        stdout: `Current Array state: [${arr.join(", ")}]\n`
      });

      if (low < j) quickSort(low, j);
      if (i < high) quickSort(i, high);
    };

    quickSort(0, n - 1);

    const allIndices = [];
    for (let idx = 0; idx < n; idx++) allIndices.push(idx);

    steps.push({
      step: stepCount++,
      line: lines.length,
      code_line: "Quick Sort Complete",
      explanation: `Quick Sort complete! Array is now completely sorted in ascending order: [${arr.join(", ")}].`,
      variables: { arr: [...arr] },
      pointers: {},
      highlights: allIndices,
      dimmed: [],
      stdout: `Final Sorted Array: [${arr.join(", ")}]\n`
    });

    return {
      algorithm_name: "Quick Sort",
      summary: "Efficient divide-and-conquer sorting algorithm using Hoare partitioning around a midpoint pivot.",
      time_complexity: "O(n log n) avg, O(n²) worst",
      space_complexity: "O(log n)",
      category: "Sorting",
      key_takeaways: [
        "Partitions the array in-place around a pivot element using two moving pointers.",
        "Average time complexity of O(n log n), with worst-case O(n²) if unbalanced partitions occur.",
        "In-place algorithm requiring O(log n) auxiliary stack space for recursion."
      ],
      language,
      code,
      lines: codeLines,
      data_structure: { type: "array", name: "arr", values: arrInput },
      steps,
      stdout: `Initial Array: [${arrInput.join(", ")}]\nSorted Array: [${arr.join(", ")}]\n`,
      ai_powered: false
    };
  }

  // 2. Binary Search (supports low/high and left/right)
  if (
    (codeStr.includes("left") || codeStr.includes("low")) &&
    (codeStr.includes("right") || codeStr.includes("high")) &&
    codeStr.includes("mid")
  ) {
    const arr = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91];
    const target = 23;
    let l = 0;
    let r = arr.length - 1;
    let stepCount = 1;
    const steps = [];

    steps.push({
      step: stepCount++,
      line: 1,
      code_line: "arr = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91]",
      explanation: "Initialize sorted array with 10 elements.",
      variables: { arr: [...arr], target, left: l, right: r },
      pointers: { left: l, right: r },
      highlights: [l, r],
      dimmed: [],
      stdout: ""
    });

    while (l <= r) {
      const mid = Math.floor((l + r) / 2);
      const dimmedIndices = [];
      for (let i = 0; i < arr.length; i++) {
        if (i < l || i > r) dimmedIndices.push(i);
      }

      steps.push({
        step: stepCount++,
        line: 9,
        code_line: "mid = (left + right) // 2",
        explanation: `Calculate midpoint index: (${l} + ${r}) // 2 = ${mid}. Element arr[${mid}] is ${arr[mid]}.`,
        variables: { target, left: l, right: r, mid, "arr[mid]": arr[mid] },
        pointers: { left: l, mid, right: r },
        highlights: [mid],
        dimmed: dimmedIndices,
        stdout: ""
      });

      if (arr[mid] === target) {
        steps.push({
          step: stepCount++,
          line: 10,
          code_line: "if arr[mid] == target:",
          explanation: `arr[${mid}] (${arr[mid]}) equals target (${target})! Match discovered.`,
          variables: { target, left: l, right: r, mid, found: mid },
          pointers: { left: l, mid, right: r, found: mid },
          highlights: [mid],
          dimmed: dimmedIndices,
          stdout: ""
        });
        steps.push({
          step: stepCount++,
          line: 12,
          code_line: "break",
          explanation: `Target found at index ${mid}. Exiting search loop.`,
          variables: { target, found: mid },
          pointers: { found: mid },
          highlights: [mid],
          dimmed: dimmedIndices,
          stdout: `Target ${target} located at index ${mid}\n`
        });
        break;
      } else if (arr[mid] < target) {
        steps.push({
          step: stepCount++,
          line: 14,
          code_line: "left = mid + 1",
          explanation: `arr[${mid}] (${arr[mid]}) < ${target}. Target must be in the right subarray. Shifting left pointer to ${mid + 1}.`,
          variables: { target, left: mid + 1, right: r, mid },
          pointers: { left: mid + 1, right: r },
          highlights: [mid],
          dimmed: dimmedIndices,
          stdout: ""
        });
        l = mid + 1;
      } else {
        steps.push({
          step: stepCount++,
          line: 16,
          code_line: "right = mid - 1",
          explanation: `arr[${mid}] (${arr[mid]}) > ${target}. Target must be in the left subarray. Shifting right pointer to ${mid - 1}.`,
          variables: { target, left: l, right: mid - 1, mid },
          pointers: { left: l, right: mid - 1 },
          highlights: [mid],
          dimmed: dimmedIndices,
          stdout: ""
        });
        r = mid - 1;
      }
    }

    return {
      algorithm_name: "Binary Search",
      summary: "Searches a sorted array by repeatedly dividing the search space in half.",
      time_complexity: "O(log n)",
      space_complexity: "O(1)",
      category: "Searching",
      key_takeaways: [
        "Requires array to be in sorted order.",
        "Halves the search space on each comparison."
      ],
      language,
      code,
      lines: codeLines,
      data_structure: { type: "array", name: "arr", values: arr },
      steps,
      stdout: `Target 23 located at index 5\n`,
      ai_powered: false
    };
  }

  // Generic fallback: step through lines
  const genericSteps = lines.slice(0, 15).map((l, idx) => ({
    step: idx + 1,
    line: idx + 1,
    code_line: l.trim(),
    explanation: `Executing line ${idx + 1}: ${l.trim() || "(empty line)"}`,
    variables: { line: idx + 1 },
    pointers: {},
    highlights: [],
    dimmed: [],
    stdout: ""
  }));

  // Generic fallback with extracted array if present
  let fallbackArr = null;
  const arrayMatch = (code || "").match(/=\s*\{([^}]+)\}/) || (code || "").match(/=\s*\[([^\]]+)\]/);
  if (arrayMatch) {
    const parsed = arrayMatch[1].match(/-?\d+/g);
    if (parsed && parsed.length > 0) fallbackArr = parsed.map(Number);
  }

  return {
    algorithm_name: "Code Execution",
    summary: "Step-by-step code execution tracing.",
    time_complexity: "O(n)",
    space_complexity: "O(1)",
    category: "General",
    key_takeaways: ["Line-by-line inspection of state and variable values."],
    language,
    code,
    lines: codeLines,
    data_structure: fallbackArr ? { type: "array", name: "arr", values: fallbackArr } : null,
    steps: genericSteps,
    stdout: "",
    ai_powered: false
  };
}

export default function CodeSimulationModal({
  isOpen,
  initialCode = "",
  initialLanguage = "cpp",
  onClose,
  accessToken
}) {
  const [code, setCode] = useState(initialCode || PRESET_ALGORITHMS[0].code);
  const [language, setLanguage] = useState(initialLanguage || "cpp");
  const [simulationData, setSimulationData] = useState(null);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1); // 0.5x, 1x, 2x
  const [isLoading, setIsLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState("visual"); // "visual" | "terminal" | "analysis"
  const [copied, setCopied] = useState(false);

  const playbackTimerRef = useRef(null);
  const codeViewerRef = useRef(null);

  // Sync initialCode when modal opens
  useEffect(() => {
    if (isOpen) {
      const targetCode = initialCode && initialCode.trim() ? initialCode : PRESET_ALGORITHMS[0].code;
      // Auto-detect C/C++ or other languages from snippet
      let targetLang = initialLanguage || "cpp";
      if (
        /\b(void|int|float|double|char|bool)\b/.test(targetCode) ||
        targetCode.includes("#include") ||
        targetCode.includes("std::") ||
        targetCode.includes("cout") ||
        targetCode.includes("printf") ||
        targetCode.includes("vector<") ||
        targetCode.includes("arr[") ||
        targetCode.includes("offset") ||
        targetCode.includes("fm")
      ) {
        targetLang = "cpp";
      } else if (
        /\b(function|const|let|var)\b/.test(targetCode) ||
        targetCode.includes("console.log")
      ) {
        targetLang = "javascript";
      }

      setCode(targetCode);
      setLanguage(targetLang);
      runSimulation(targetCode, targetLang);
    } else {
      setIsPlaying(false);
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    }
  }, [isOpen, initialCode, initialLanguage]);

  // Execute simulation (calls backend API or falls back cleanly)
  const runSimulation = async (codeToRun = code, langToRun = language) => {
    setIsLoading(true);
    setIsPlaying(false);
    if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);

    try {
      const res = await simulateCode(codeToRun, langToRun, "", accessToken);
      if (res && res.steps && res.steps.length > 0) {
        setSimulationData(res);
        if (res.language) setLanguage(res.language);
        setCurrentStepIdx(0);
      } else {
        const fallback = generateClientFallbackTrace(codeToRun, langToRun);
        setSimulationData(fallback);
        if (fallback.language) setLanguage(fallback.language);
        setCurrentStepIdx(0);
      }
    } catch (err) {
      console.warn("Backend simulation API error, generating client trace:", err);
      const fallback = generateClientFallbackTrace(codeToRun, langToRun);
      setSimulationData(fallback);
      if (fallback.language) setLanguage(fallback.language);
      setCurrentStepIdx(0);
    } finally {
      setIsLoading(false);
    }
  };

  // Autoplay loop
  useEffect(() => {
    if (!isPlaying || !simulationData?.steps?.length) {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
      return;
    }

    const intervalMs = Math.round(1400 / playSpeed);
    playbackTimerRef.current = setInterval(() => {
      setCurrentStepIdx((prev) => {
        if (prev >= simulationData.steps.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    };
  }, [isPlaying, playSpeed, simulationData]);

  // Current step details
  const steps = simulationData?.steps || [];
  const currentStep = steps[currentStepIdx] || null;
  const currentLineNumber = currentStep?.line || 1;

  // Auto scroll code viewer to active line
  useEffect(() => {
    if (codeViewerRef.current && currentLineNumber) {
      const activeLineElem = codeViewerRef.current.querySelector(`[data-line="${currentLineNumber}"]`);
      if (activeLineElem) {
        activeLineElem.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [currentLineNumber]);

  // Stepper controls
  const handleNextStep = () => {
    if (currentStepIdx < steps.length - 1) {
      setCurrentStepIdx(currentStepIdx + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStepIdx > 0) {
      setCurrentStepIdx(currentStepIdx - 1);
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStepIdx(0);
  };

  const handleJumpToEnd = () => {
    setIsPlaying(false);
    if (steps.length > 0) setCurrentStepIdx(steps.length - 1);
  };

  const togglePlay = () => {
    if (currentStepIdx >= steps.length - 1) {
      setCurrentStepIdx(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  if (!isOpen) return null;

  // Array values from data structure or variables
  const arrayData = simulationData?.data_structure?.values ||
    (Array.isArray(currentStep?.variables?.arr) ? currentStep.variables.arr : null);

  const pointers = currentStep?.pointers || {};
  const highlights = currentStep?.highlights || [];
  const dimmed = currentStep?.dimmed || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/60 backdrop-blur-md animate-fade-in macos-font">
      <div
        className={`macos-sheet-modal bg-[var(--surface)] text-[var(--text)] flex flex-col overflow-hidden transition-all duration-300 shadow-2xl ${
          isFullscreen ? "w-full h-full rounded-none" : "w-full max-w-6xl h-[90vh] rounded-[22px]"
        }`}
      >
        {/* =========================================================================
            macOS Unified Window Titlebar
            ========================================================================= */}
        <div className="macos-titlebar px-4 py-3 flex items-center justify-between border-b border-black/8 dark:border-white/8 select-none flex-wrap gap-2">
          {/* Left: Traffic Lights & Title */}
          <div className="flex items-center gap-3">
            <div className="macos-traffic-container flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                title="Close Simulator (Esc)"
                className="macos-traffic-light macos-traffic-close"
              >
                <span className="macos-traffic-symbol">✕</span>
              </button>
              <button
                type="button"
                onClick={handleReset}
                title="Reset to Step 0"
                className="macos-traffic-light macos-traffic-minimize"
              >
                <span className="macos-traffic-symbol">−</span>
              </button>
              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                title={isFullscreen ? "Restore Window" : "Full Screen"}
                className="macos-traffic-light macos-traffic-zoom"
              >
                <span className="macos-traffic-symbol">+</span>
              </button>
            </div>

            <div className="flex items-center gap-2 ml-2">
              <Cpu size={16} className="text-[#007AFF]" />
              <span className="font-semibold text-sm">
                {simulationData?.algorithm_name || "Code Simulation Studio"}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#007AFF]/10 text-[#007AFF] border border-[#007AFF]/20">
                {language.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Center: Complexity Badges & AI Status */}
          <div className="hidden lg:flex items-center gap-2">
            {simulationData?.time_complexity && (
              <span className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-[var(--text)]">
                <span className="text-[var(--muted)]">Time:</span>
                <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">
                  {simulationData.time_complexity}
                </span>
              </span>
            )}
            {simulationData?.space_complexity && (
              <span className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-[var(--text)]">
                <span className="text-[var(--muted)]">Space:</span>
                <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                  {simulationData.space_complexity}
                </span>
              </span>
            )}
            {simulationData?.ai_powered && (
              <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Bot size={11} />
                <span>Ollama AI</span>
              </span>
            )}
          </div>

          {/* Right: Preset Algorithms Dropdown & Close */}
          <div className="flex items-center gap-2">
            {/* Algorithm Presets */}
            <select
              onChange={(e) => {
                const found = PRESET_ALGORITHMS.find((a) => a.name === e.target.value);
                if (found) {
                  setCode(found.code);
                  setLanguage(found.language);
                  runSimulation(found.code, found.language);
                }
              }}
              defaultValue=""
              className="text-xs h-7 px-2 rounded-lg bg-black/5 dark:bg-white/10 border border-black/8 dark:border-white/10 text-[var(--text)] outline-none cursor-pointer hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
              title="Load standard algorithm demo"
            >
              <option value="" disabled>Load Algorithm Example...</option>
              {PRESET_ALGORITHMS.map((algo) => (
                <option key={algo.name} value={algo.name}>{algo.name}</option>
              ))}
            </select>

            <button
              onClick={() => runSimulation(code, language)}
              disabled={isLoading}
              title="Re-run Simulation"
              className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[#007AFF] hover:bg-black/5 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={isLoading ? "animate-spin text-[#007AFF]" : ""} />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              title="Close (Esc)"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* =========================================================================
            Main Split-Screen Workspace (Left: Code Viewer / Right: Simulation Canvas)
            ========================================================================= */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 min-h-0 overflow-hidden divide-y md:divide-y-0 md:divide-x divide-black/8 dark:divide-white/8">
          {/* -------------------------------------------------------------------
              LEFT COLUMN: Code Viewer with Live Stepping Pointer (5 cols)
              ------------------------------------------------------------------- */}
          <div className="md:col-span-5 flex flex-col bg-black/[0.02] dark:bg-black/25 min-h-0 overflow-hidden">
            {/* Code Header Bar */}
            <div className="px-3 py-2 flex items-center justify-between border-b border-black/6 dark:border-white/6 text-xs text-[var(--muted)]">
              <div className="flex items-center gap-1.5 font-medium">
                <Code2 size={13} className="text-[#007AFF]" />
                <span>Program Source</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  title="Copy code"
                >
                  {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>

            {/* Code Lines with Active Line Highlight */}
            <div
              ref={codeViewerRef}
              className="flex-1 overflow-y-auto sa-scroll p-2 text-xs md:text-sm font-mono leading-relaxed"
            >
              {(simulationData?.lines || code.split("\n").map((l, i) => ({ line_number: i + 1, text: l }))).map((line) => {
                const isActive = line.line_number === currentLineNumber;
                return (
                  <div
                    key={line.line_number}
                    data-line={line.line_number}
                    className={`flex items-start rounded-md px-2 py-0.5 transition-all ${
                      isActive
                        ? "bg-[#007AFF]/18 dark:bg-[#0A84FF]/28 text-[#007AFF] dark:text-[#5AC8FA] font-semibold shadow-xs"
                        : "hover:bg-black/4 dark:hover:bg-white/4 text-[var(--text)]"
                    }`}
                  >
                    {/* Line Pointer Indicator */}
                    <span className="w-4 flex-shrink-0 text-center select-none mr-1 font-bold text-[11px]">
                      {isActive ? "►" : ""}
                    </span>

                    {/* Line Number */}
                    <span className="w-6 flex-shrink-0 text-right pr-3 select-none text-[var(--muted)] opacity-60 text-xs">
                      {line.line_number}
                    </span>

                    {/* Code Text */}
                    <span className="flex-1 whitespace-pre overflow-x-auto truncate hljs font-mono">
                      {highlightCodeToReact(line.text || " ", language)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Step Summary Card at bottom of code viewer */}
            <div className="p-3 bg-black/4 dark:bg-white/4 border-t border-black/6 dark:border-white/6 text-xs">
              <div className="flex items-center justify-between text-[11px] text-[var(--muted)] mb-1">
                <span>Active Step: {currentStepIdx + 1} / {steps.length || 1}</span>
                <span>Line: {currentLineNumber}</span>
              </div>
              <p className="text-xs font-medium text-[var(--text)] line-clamp-2">
                {currentStep?.explanation || "Ready to execute simulation."}
              </p>
            </div>
          </div>

          {/* -------------------------------------------------------------------
              RIGHT COLUMN: Visual Data Structures & Inspector (7 cols)
              ------------------------------------------------------------------- */}
          <div className="md:col-span-7 flex flex-col min-h-0 bg-white/70 dark:bg-[#1C1C22]/80">
            {/* View Switcher Tabs (Visual Simulator vs Terminal Output vs Analysis) */}
            <div className="px-4 py-2 border-b border-black/6 dark:border-white/6 flex items-center justify-between flex-wrap gap-2">
              <div className="macos-segmented-bar">
                <button
                  onClick={() => setActiveTab("visual")}
                  className={`macos-segmented-btn flex items-center gap-1.5 ${activeTab === "visual" ? "active" : ""}`}
                >
                  <Layers size={12} />
                  <span>Visual Simulation</span>
                </button>
                <button
                  onClick={() => setActiveTab("terminal")}
                  className={`macos-segmented-btn flex items-center gap-1.5 ${activeTab === "terminal" ? "active" : ""}`}
                >
                  <Terminal size={12} />
                  <span>Terminal Console</span>
                </button>
                <button
                  onClick={() => setActiveTab("analysis")}
                  className={`macos-segmented-btn flex items-center gap-1.5 ${activeTab === "analysis" ? "active" : ""}`}
                >
                  <Activity size={12} />
                  <span>Algorithm Insights</span>
                </button>
              </div>

              {/* Status Pill */}
              <div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                <span className={`w-2 h-2 rounded-full ${isPlaying ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                <span>{isPlaying ? "Simulating..." : "Paused"}</span>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto sa-scroll p-4 md:p-6 space-y-5">
              {/* TAB 1: VISUAL SIMULATOR */}
              {activeTab === "visual" && (
                <div className="space-y-5 animate-fade-in">
                  {/* Visual Data Structure Ribbon (Arrays & Moving Pointers) */}
                  {arrayData && Array.isArray(arrayData) ? (
                    <div className="p-4 rounded-2xl bg-black/[0.03] dark:bg-black/30 border border-black/8 dark:border-white/8 space-y-3">
                      <div className="flex items-center justify-between text-xs font-semibold text-[var(--muted)]">
                        <span className="flex items-center gap-1.5 text-[var(--text)]">
                          <Layers size={13} className="text-[#007AFF]" />
                          <span>Array State: `{simulationData?.data_structure?.name || "arr"}`</span>
                        </span>
                        <span>Length: {arrayData.length}</span>
                      </div>

                      {/* Array Container with Pointers */}
                      <div className="pt-8 pb-8 overflow-x-auto sa-scroll flex items-center justify-start md:justify-center gap-2 min-h-[140px] px-2">
                        {arrayData.map((val, idx) => {
                          const isHighlighted = highlights.includes(idx);
                          const isDimmed = dimmed.includes(idx);
                          // Determine pointers at this index
                          const activePointersAtIdx = Object.entries(pointers).filter(
                            ([pName, pIdx]) => pIdx === idx
                          );

                          return (
                            <div key={idx} className="flex flex-col items-center flex-shrink-0 relative">
                              {/* Top Pointers (left, right, i, j, low, high) */}
                              <div className="absolute -top-7 flex flex-col items-center gap-0.5">
                                {activePointersAtIdx
                                  .filter(([p]) => p !== "mid" && p !== "pivot")
                                  .map(([pName]) => (
                                    <span
                                      key={pName}
                                      className="px-1.5 py-0.5 rounded text-[10px] font-bold tracking-tight bg-[#007AFF] text-white shadow-xs animate-bounce"
                                      title={`Pointer: ${pName} = ${idx}`}
                                    >
                                      {pName} ⬇
                                    </span>
                                  ))}
                              </div>

                              {/* Array Element Box */}
                              <div
                                className={`w-11 h-12 md:w-12 md:h-14 rounded-xl flex flex-col items-center justify-center font-mono font-bold transition-all duration-200 border-2 ${
                                  isHighlighted
                                    ? "bg-amber-500/20 border-amber-500 text-amber-900 dark:text-amber-200 shadow-md scale-105"
                                    : isDimmed
                                    ? "bg-black/5 dark:bg-white/5 border-transparent text-[var(--muted)] opacity-35"
                                    : "bg-white dark:bg-[#25252D] border-black/10 dark:border-white/10 text-[var(--text)] shadow-xs hover:border-[#007AFF]"
                                }`}
                              >
                                <span className="text-sm md:text-base">{val}</span>
                              </div>

                              {/* Index Number Underneath */}
                              <span className="text-[10px] font-mono text-[var(--muted)] mt-1.5">
                                [{idx}]
                              </span>

                              {/* Bottom Pointer (mid / pivot) */}
                              <div className="absolute -bottom-7 flex flex-col items-center gap-0.5">
                                {activePointersAtIdx
                                  .filter(([p]) => p === "mid" || p === "pivot")
                                  .map(([pName]) => (
                                    <span
                                      key={pName}
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold tracking-tight shadow-xs animate-pulse ${
                                        pName === "pivot"
                                          ? "bg-purple-600 text-white"
                                          : "bg-amber-500 text-slate-950"
                                      }`}
                                      title={`Marker: ${pName} = ${idx}`}
                                    >
                                      ⬆ {pName}
                                    </span>
                                  ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Legend */}
                      <div className="flex items-center justify-center gap-4 text-[11px] text-[var(--muted)] pt-2 border-t border-black/5 dark:border-white/5 flex-wrap">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                          <span>Inspected / Compared</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                          <span>Pivot (Quick Sort)</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#007AFF]" />
                          <span>Active Pointers (i, j, bounds)</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-gray-400 opacity-40" />
                          <span>Inactive Subarray</span>
                        </span>
                      </div>
                    </div>
                  ) : null}

                  {/* Variables Watch Panel */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
                      <Cpu size={12} className="text-[#007AFF]" />
                      <span>Variables Inspector</span>
                    </h4>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                      {Object.entries(currentStep?.variables || {}).map(([vName, vVal]) => {
                        const isArrayVal = Array.isArray(vVal);
                        const isPointer = Object.keys(pointers).includes(vName);
                        return (
                          <div
                            key={vName}
                            className={`p-2.5 rounded-xl border transition-all ${
                              isPointer
                                ? "bg-[#007AFF]/8 border-[#007AFF]/25"
                                : "bg-black/[0.02] dark:bg-white/[0.04] border-black/8 dark:border-white/8"
                            }`}
                          >
                            <span className="text-[11px] font-mono text-[var(--muted)] block truncate">
                              {vName}
                            </span>
                            <span className="text-xs font-mono font-bold text-[var(--text)] mt-0.5 block truncate">
                              {isArrayVal ? `[${vVal.length} items]` : String(vVal)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Plain English Step Explanation Card */}
                  <div className="p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-950/25 border border-amber-500/25 flex items-start gap-3">
                    <HelpCircle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h5 className="font-semibold text-xs text-amber-800 dark:text-amber-300">
                        Step {currentStepIdx + 1} Logic Breakdown:
                      </h5>
                      <p className="text-xs leading-relaxed text-[var(--text)]">
                        {currentStep?.explanation || "Analyzing code statement."}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: TERMINAL CONSOLE */}
              {activeTab === "terminal" && (
                <div className="space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between text-xs text-[var(--muted)]">
                    <span className="font-semibold flex items-center gap-1.5">
                      <Terminal size={13} className="text-emerald-500" />
                      <span>Standard Output (stdout)</span>
                    </span>
                    <span>Sandbox Stream</span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950 text-emerald-400 font-mono text-xs leading-relaxed min-h-[220px] max-h-[360px] overflow-y-auto sa-scroll shadow-inner">
                    <pre className="whitespace-pre-wrap">
                      {currentStep?.stdout || simulationData?.stdout || "(No terminal output produced yet)"}
                    </pre>
                  </div>

                  {simulationData?.error && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
                      <AlertCircle size={14} className="flex-shrink-0" />
                      <span>Traceback Error: {simulationData.error}</span>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: ALGORITHM INSIGHTS & ANALYSIS */}
              {activeTab === "analysis" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-4 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/8 dark:border-white/8 space-y-2">
                    <h4 className="font-semibold text-sm text-[var(--text)] flex items-center gap-1.5">
                      <Sparkles size={14} className="text-amber-500" />
                      <span>{simulationData?.algorithm_name || "Algorithm Analysis"}</span>
                    </h4>
                    <p className="text-xs leading-relaxed text-[var(--muted)]">
                      {simulationData?.summary || "Comprehensive breakdown of time complexity and data flow."}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <span className="text-[11px] font-medium text-amber-700 dark:text-amber-300 block">
                        Time Complexity
                      </span>
                      <span className="text-base font-mono font-bold text-amber-600 dark:text-amber-400 mt-1 block">
                        {simulationData?.time_complexity || "O(n)"}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                      <span className="text-[11px] font-medium text-blue-700 dark:text-blue-300 block">
                        Space Complexity
                      </span>
                      <span className="text-base font-mono font-bold text-blue-600 dark:text-blue-400 mt-1 block">
                        {simulationData?.space_complexity || "O(1)"}
                      </span>
                    </div>
                  </div>

                  {simulationData?.key_takeaways && simulationData.key_takeaways.length > 0 && (
                    <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-2">
                      <h5 className="font-semibold text-xs text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                        <Flame size={13} className="text-purple-500" />
                        <span>Key Concepts & Interview Notes:</span>
                      </h5>
                      <ul className="text-xs space-y-1.5 text-[var(--text)] list-disc pl-4">
                        {simulationData.key_takeaways.map((tip, idx) => (
                          <li key={idx}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* =====================================================================
                BOTTOM BAR: Playback Controller & Step Scrubber
                ===================================================================== */}
            <div className="p-3.5 border-t border-black/8 dark:border-white/8 bg-white/90 dark:bg-[#1E1E24]/90 flex items-center justify-between gap-3 select-none flex-wrap">
              {/* Left: Step Playback Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleReset}
                  className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  title="Reset to Step 1 (⏮)"
                >
                  <SkipBack size={15} />
                </button>

                <button
                  onClick={handlePrevStep}
                  disabled={currentStepIdx === 0}
                  className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors disabled:opacity-30"
                  title="Previous Step (◀)"
                >
                  <ChevronLeft size={16} />
                </button>

                <button
                  onClick={togglePlay}
                  className="px-3.5 py-1.5 rounded-xl bg-[#007AFF] hover:bg-[#007AFF]/90 active:scale-95 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md transition-all"
                  title={isPlaying ? "Pause Simulation (Space)" : "Play Simulation (Space)"}
                >
                  {isPlaying ? <Pause size={13} /> : <Play size={13} />}
                  <span>{isPlaying ? "Pause" : "Play"}</span>
                </button>

                <button
                  onClick={handleNextStep}
                  disabled={currentStepIdx >= steps.length - 1}
                  className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors disabled:opacity-30"
                  title="Next Step (▶)"
                >
                  <ChevronRight size={16} />
                </button>

                <button
                  onClick={handleJumpToEnd}
                  className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  title="Jump to Final Step (⏭)"
                >
                  <SkipForward size={15} />
                </button>
              </div>

              {/* Center: Timeline Scrubber Slider */}
              <div className="flex items-center gap-2 flex-1 max-w-xs mx-auto">
                <span className="text-[11px] font-mono text-[var(--muted)] flex-shrink-0">
                  {currentStepIdx + 1}/{steps.length || 1}
                </span>
                <input
                  type="range"
                  min="0"
                  max={Math.max((steps.length || 1) - 1, 0)}
                  value={currentStepIdx}
                  onChange={(e) => {
                    setIsPlaying(false);
                    setCurrentStepIdx(parseInt(e.target.value, 10));
                  }}
                  className="w-full h-1.5 bg-black/10 dark:bg-white/15 rounded-lg appearance-none cursor-pointer accent-[#007AFF]"
                />
              </div>

              {/* Right: Speed Controls */}
              <div className="flex items-center gap-1">
                {[0.5, 1, 2].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setPlaySpeed(spd)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors ${
                      playSpeed === spd
                        ? "bg-[#007AFF] text-white"
                        : "text-[var(--muted)] hover:bg-black/5 dark:hover:bg-white/10"
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
