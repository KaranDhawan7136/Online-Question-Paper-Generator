const mongoose = require('mongoose');
require('dotenv').config();
const Question = require('./models/Question');

const dsaQuestions = [
    // ============================================================
    // MCQ Questions (15 questions, 1 mark each)
    // ============================================================
    {
        text: "What is the time complexity of binary search on a sorted array of n elements?",
        subject: "Data Structures and Algorithms",
        topic: "Searching",
        unit: "Unit 1",
        difficultyLevel: 1,
        estimatedTime: 1,
        marks: 1,
        questionType: "MCQ",
        options: ["O(n)", "O(log n)", "O(n log n)", "O(1)"],
        correctAnswer: "O(log n)",
        bloomsTaxonomy: "R",
        cloMapping: 1
    },
    {
        text: "Which data structure uses FIFO (First In First Out) ordering?",
        subject: "Data Structures and Algorithms",
        topic: "Linear Data Structures",
        unit: "Unit 1",
        difficultyLevel: 1,
        estimatedTime: 1,
        marks: 1,
        questionType: "MCQ",
        options: ["Stack", "Queue", "Tree", "Graph"],
        correctAnswer: "Queue",
        bloomsTaxonomy: "R",
        cloMapping: 1
    },
    {
        text: "What is the worst-case time complexity of QuickSort?",
        subject: "Data Structures and Algorithms",
        topic: "Sorting",
        unit: "Unit 2",
        difficultyLevel: 2,
        estimatedTime: 1,
        marks: 1,
        questionType: "MCQ",
        options: ["O(n log n)", "O(n^2)", "O(n)", "O(log n)"],
        correctAnswer: "O(n^2)",
        bloomsTaxonomy: "R",
        cloMapping: 2
    },
    {
        text: "Which traversal of a Binary Search Tree gives nodes in ascending order?",
        subject: "Data Structures and Algorithms",
        topic: "Trees",
        unit: "Unit 3",
        difficultyLevel: 2,
        estimatedTime: 1,
        marks: 1,
        questionType: "MCQ",
        options: ["Preorder", "Postorder", "Inorder", "Level order"],
        correctAnswer: "Inorder",
        bloomsTaxonomy: "U",
        cloMapping: 2
    },
    {
        text: "What is the maximum number of nodes at level 'k' of a binary tree?",
        subject: "Data Structures and Algorithms",
        topic: "Trees",
        unit: "Unit 3",
        difficultyLevel: 2,
        estimatedTime: 1,
        marks: 1,
        questionType: "MCQ",
        options: ["2^k", "2^(k-1)", "2^(k+1)", "k^2"],
        correctAnswer: "2^k",
        bloomsTaxonomy: "R",
        cloMapping: 2
    },
    {
        text: "Which of the following is NOT a stable sorting algorithm?",
        subject: "Data Structures and Algorithms",
        topic: "Sorting",
        unit: "Unit 2",
        difficultyLevel: 3,
        estimatedTime: 1,
        marks: 1,
        questionType: "MCQ",
        options: ["Merge Sort", "Bubble Sort", "Quick Sort", "Insertion Sort"],
        correctAnswer: "Quick Sort",
        bloomsTaxonomy: "U",
        cloMapping: 2
    },
    {
        text: "What data structure is used for implementing Breadth First Search (BFS)?",
        subject: "Data Structures and Algorithms",
        topic: "Graphs",
        unit: "Unit 4",
        difficultyLevel: 1,
        estimatedTime: 1,
        marks: 1,
        questionType: "MCQ",
        options: ["Stack", "Queue", "Priority Queue", "Linked List"],
        correctAnswer: "Queue",
        bloomsTaxonomy: "R",
        cloMapping: 3
    },
    {
        text: "The amortized time complexity of inserting an element into a dynamic array is:",
        subject: "Data Structures and Algorithms",
        topic: "Arrays",
        unit: "Unit 1",
        difficultyLevel: 3,
        estimatedTime: 1,
        marks: 1,
        questionType: "MCQ",
        options: ["O(n)", "O(1)", "O(log n)", "O(n^2)"],
        correctAnswer: "O(1)",
        bloomsTaxonomy: "U",
        cloMapping: 1
    },
    {
        text: "Which of the following algorithms is used to find the shortest path in a weighted graph with no negative edges?",
        subject: "Data Structures and Algorithms",
        topic: "Graphs",
        unit: "Unit 4",
        difficultyLevel: 2,
        estimatedTime: 1,
        marks: 1,
        questionType: "MCQ",
        options: ["DFS", "BFS", "Dijkstra's Algorithm", "Bellman-Ford Algorithm"],
        correctAnswer: "Dijkstra's Algorithm",
        bloomsTaxonomy: "R",
        cloMapping: 3
    },
    {
        text: "What is the space complexity of Merge Sort?",
        subject: "Data Structures and Algorithms",
        topic: "Sorting",
        unit: "Unit 2",
        difficultyLevel: 2,
        estimatedTime: 1,
        marks: 1,
        questionType: "MCQ",
        options: ["O(1)", "O(log n)", "O(n)", "O(n^2)"],
        correctAnswer: "O(n)",
        bloomsTaxonomy: "R",
        cloMapping: 2
    },
    {
        text: "A full binary tree with n leaves contains how many total nodes?",
        subject: "Data Structures and Algorithms",
        topic: "Trees",
        unit: "Unit 3",
        difficultyLevel: 2,
        estimatedTime: 1,
        marks: 1,
        questionType: "MCQ",
        options: ["2n", "2n - 1", "2n + 1", "n + 1"],
        correctAnswer: "2n - 1",
        bloomsTaxonomy: "U",
        cloMapping: 2
    },
    {
        text: "Which of the following is the best data structure for implementing a priority queue?",
        subject: "Data Structures and Algorithms",
        topic: "Heaps",
        unit: "Unit 3",
        difficultyLevel: 2,
        estimatedTime: 1,
        marks: 1,
        questionType: "MCQ",
        options: ["Array", "Linked List", "Heap", "Stack"],
        correctAnswer: "Heap",
        bloomsTaxonomy: "U",
        cloMapping: 2
    },
    {
        text: "What is the time complexity of inserting a node at the beginning of a singly linked list?",
        subject: "Data Structures and Algorithms",
        topic: "Linked Lists",
        unit: "Unit 1",
        difficultyLevel: 1,
        estimatedTime: 1,
        marks: 1,
        questionType: "MCQ",
        options: ["O(1)", "O(n)", "O(log n)", "O(n^2)"],
        correctAnswer: "O(1)",
        bloomsTaxonomy: "R",
        cloMapping: 1
    },
    {
        text: "Hashing with open addressing resolves collisions by:",
        subject: "Data Structures and Algorithms",
        topic: "Hashing",
        unit: "Unit 5",
        difficultyLevel: 3,
        estimatedTime: 1,
        marks: 1,
        questionType: "MCQ",
        options: ["Storing in the same slot using a linked list", "Probing for the next available slot", "Rehashing the entire table", "Using a secondary hash table"],
        correctAnswer: "Probing for the next available slot",
        bloomsTaxonomy: "U",
        cloMapping: 4
    },
    {
        text: "The number of edges in a complete graph with n vertices is:",
        subject: "Data Structures and Algorithms",
        topic: "Graphs",
        unit: "Unit 4",
        difficultyLevel: 2,
        estimatedTime: 1,
        marks: 1,
        questionType: "MCQ",
        options: ["n(n-1)/2", "n(n+1)/2", "n^2", "2n"],
        correctAnswer: "n(n-1)/2",
        bloomsTaxonomy: "R",
        cloMapping: 3
    },

    // ============================================================
    // 2 Mark Questions (15 questions)
    // ============================================================
    {
        text: "Differentiate between a stack and a queue with examples.",
        subject: "Data Structures and Algorithms",
        topic: "Linear Data Structures",
        unit: "Unit 1",
        difficultyLevel: 1,
        estimatedTime: 3,
        marks: 2,
        questionType: "2 Mark",
        options: [],
        correctAnswer: "Stack follows LIFO (Last In First Out) – e.g., undo operation. Queue follows FIFO (First In First Out) – e.g., print job scheduling.",
        bloomsTaxonomy: "U",
        cloMapping: 1
    },
    {
        text: "Define Big-O, Big-Omega, and Big-Theta notations.",
        subject: "Data Structures and Algorithms",
        topic: "Algorithm Analysis",
        unit: "Unit 1",
        difficultyLevel: 2,
        estimatedTime: 3,
        marks: 2,
        questionType: "2 Mark",
        options: [],
        correctAnswer: "Big-O: upper bound of growth rate. Big-Omega: lower bound of growth rate. Big-Theta: tight bound (both upper and lower) of growth rate.",
        bloomsTaxonomy: "R",
        cloMapping: 1
    },
    {
        text: "What is a collision in hashing? Name two collision resolution techniques.",
        subject: "Data Structures and Algorithms",
        topic: "Hashing",
        unit: "Unit 5",
        difficultyLevel: 2,
        estimatedTime: 3,
        marks: 2,
        questionType: "2 Mark",
        options: [],
        correctAnswer: "A collision occurs when two keys hash to the same index. Techniques: (1) Chaining (separate chaining using linked lists), (2) Open Addressing (linear probing, quadratic probing, double hashing).",
        bloomsTaxonomy: "U",
        cloMapping: 4
    },
    {
        text: "What is the difference between a singly linked list and a doubly linked list?",
        subject: "Data Structures and Algorithms",
        topic: "Linked Lists",
        unit: "Unit 1",
        difficultyLevel: 1,
        estimatedTime: 3,
        marks: 2,
        questionType: "2 Mark",
        options: [],
        correctAnswer: "Singly linked list has nodes with a single pointer to the next node. Doubly linked list has nodes with two pointers – one to the next node and one to the previous node, allowing bidirectional traversal.",
        bloomsTaxonomy: "U",
        cloMapping: 1
    },
    {
        text: "Define a complete binary tree and a perfect binary tree.",
        subject: "Data Structures and Algorithms",
        topic: "Trees",
        unit: "Unit 3",
        difficultyLevel: 2,
        estimatedTime: 3,
        marks: 2,
        questionType: "2 Mark",
        options: [],
        correctAnswer: "Complete binary tree: all levels are fully filled except possibly the last, which is filled from left to right. Perfect binary tree: all internal nodes have two children and all leaf nodes are at the same level.",
        bloomsTaxonomy: "R",
        cloMapping: 2
    },
    {
        text: "What is a circular queue? How does it overcome the limitation of a linear queue?",
        subject: "Data Structures and Algorithms",
        topic: "Linear Data Structures",
        unit: "Unit 1",
        difficultyLevel: 2,
        estimatedTime: 3,
        marks: 2,
        questionType: "2 Mark",
        options: [],
        correctAnswer: "A circular queue connects the rear end back to the front, forming a circle. It overcomes the problem of wasted space in a linear queue when elements are dequeued from the front.",
        bloomsTaxonomy: "U",
        cloMapping: 1
    },
    {
        text: "State the properties of a Binary Search Tree (BST).",
        subject: "Data Structures and Algorithms",
        topic: "Trees",
        unit: "Unit 3",
        difficultyLevel: 1,
        estimatedTime: 3,
        marks: 2,
        questionType: "2 Mark",
        options: [],
        correctAnswer: "In a BST: (1) Left subtree of a node contains only nodes with keys less than the node's key. (2) Right subtree contains only nodes with keys greater than the node's key. (3) Both left and right subtrees are also BSTs.",
        bloomsTaxonomy: "R",
        cloMapping: 2
    },
    {
        text: "Compare adjacency matrix and adjacency list representations of a graph.",
        subject: "Data Structures and Algorithms",
        topic: "Graphs",
        unit: "Unit 4",
        difficultyLevel: 2,
        estimatedTime: 3,
        marks: 2,
        questionType: "2 Mark",
        options: [],
        correctAnswer: "Adjacency matrix uses O(V^2) space and allows O(1) edge lookup. Adjacency list uses O(V+E) space and is more space-efficient for sparse graphs but edge lookup takes O(degree) time.",
        bloomsTaxonomy: "U",
        cloMapping: 3
    },
    {
        text: "What is the difference between BFS and DFS graph traversals?",
        subject: "Data Structures and Algorithms",
        topic: "Graphs",
        unit: "Unit 4",
        difficultyLevel: 2,
        estimatedTime: 3,
        marks: 2,
        questionType: "2 Mark",
        options: [],
        correctAnswer: "BFS explores all neighbors at the current depth before moving deeper (uses a queue). DFS explores as far as possible along a branch before backtracking (uses a stack or recursion).",
        bloomsTaxonomy: "U",
        cloMapping: 3
    },
    {
        text: "What is a Min-Heap? State the heap property.",
        subject: "Data Structures and Algorithms",
        topic: "Heaps",
        unit: "Unit 3",
        difficultyLevel: 2,
        estimatedTime: 3,
        marks: 2,
        questionType: "2 Mark",
        options: [],
        correctAnswer: "A Min-Heap is a complete binary tree where the value of each node is less than or equal to the values of its children. The root always contains the minimum element. Heap property: parent <= children.",
        bloomsTaxonomy: "R",
        cloMapping: 2
    },
    {
        text: "Define recursion. Give an example of a problem solved using recursion.",
        subject: "Data Structures and Algorithms",
        topic: "Recursion",
        unit: "Unit 2",
        difficultyLevel: 1,
        estimatedTime: 3,
        marks: 2,
        questionType: "2 Mark",
        options: [],
        correctAnswer: "Recursion is a technique where a function calls itself to solve smaller subproblems. Example: Computing factorial — factorial(n) = n * factorial(n-1), with base case factorial(0) = 1.",
        bloomsTaxonomy: "U",
        cloMapping: 1
    },
    {
        text: "What is a spanning tree of a graph? When is it called a minimum spanning tree?",
        subject: "Data Structures and Algorithms",
        topic: "Graphs",
        unit: "Unit 4",
        difficultyLevel: 2,
        estimatedTime: 3,
        marks: 2,
        questionType: "2 Mark",
        options: [],
        correctAnswer: "A spanning tree is a subgraph that includes all vertices connected with the minimum number of edges (V-1). It is a minimum spanning tree (MST) when the total weight of edges is minimized among all possible spanning trees.",
        bloomsTaxonomy: "U",
        cloMapping: 3
    },
    {
        text: "What is the difference between linear search and binary search?",
        subject: "Data Structures and Algorithms",
        topic: "Searching",
        unit: "Unit 1",
        difficultyLevel: 1,
        estimatedTime: 3,
        marks: 2,
        questionType: "2 Mark",
        options: [],
        correctAnswer: "Linear search checks each element sequentially with O(n) time and works on unsorted arrays. Binary search divides the array in half each step with O(log n) time but requires a sorted array.",
        bloomsTaxonomy: "U",
        cloMapping: 1
    },
    {
        text: "Explain the concept of an AVL tree rotation. Name the types of rotations.",
        subject: "Data Structures and Algorithms",
        topic: "Trees",
        unit: "Unit 3",
        difficultyLevel: 3,
        estimatedTime: 3,
        marks: 2,
        questionType: "2 Mark",
        options: [],
        correctAnswer: "AVL tree rotations are performed to restore the height-balance property after insertion or deletion. Four types: Left rotation (LL), Right rotation (RR), Left-Right rotation (LR), Right-Left rotation (RL).",
        bloomsTaxonomy: "U",
        cloMapping: 2
    },
    {
        text: "What is the time complexity of insertion and deletion in a heap?",
        subject: "Data Structures and Algorithms",
        topic: "Heaps",
        unit: "Unit 3",
        difficultyLevel: 2,
        estimatedTime: 3,
        marks: 2,
        questionType: "2 Mark",
        options: [],
        correctAnswer: "Both insertion and deletion (extract min/max) in a heap take O(log n) time. Insertion adds at the end and performs heapify-up. Deletion removes root, replaces with last element, and performs heapify-down.",
        bloomsTaxonomy: "R",
        cloMapping: 2
    },

    // ============================================================
    // 5 Mark Questions (10 questions)
    // ============================================================
    {
        text: "Explain the Merge Sort algorithm with its working, pseudocode, and time complexity analysis. Illustrate with an example array [38, 27, 43, 3, 9, 82, 10].",
        subject: "Data Structures and Algorithms",
        topic: "Sorting",
        unit: "Unit 2",
        difficultyLevel: 3,
        estimatedTime: 10,
        marks: 5,
        questionType: "5 Mark",
        options: [],
        correctAnswer: "",
        bloomsTaxonomy: "P",
        cloMapping: 2
    },
    {
        text: "Describe Dijkstra's algorithm for finding the shortest path. Trace the algorithm on a given weighted graph with at least 5 vertices. State its time complexity.",
        subject: "Data Structures and Algorithms",
        topic: "Graphs",
        unit: "Unit 4",
        difficultyLevel: 4,
        estimatedTime: 12,
        marks: 5,
        questionType: "5 Mark",
        options: [],
        correctAnswer: "",
        bloomsTaxonomy: "P",
        cloMapping: 3
    },
    {
        text: "Explain the concept of hashing. Describe separate chaining and open addressing (linear probing) collision resolution techniques with examples. Compute the load factor.",
        subject: "Data Structures and Algorithms",
        topic: "Hashing",
        unit: "Unit 5",
        difficultyLevel: 3,
        estimatedTime: 10,
        marks: 5,
        questionType: "5 Mark",
        options: [],
        correctAnswer: "",
        bloomsTaxonomy: "P",
        cloMapping: 4
    },
    {
        text: "Write an algorithm to convert an infix expression to postfix expression using a stack. Trace the algorithm for the expression: A + B * C - (D / E + F) * G.",
        subject: "Data Structures and Algorithms",
        topic: "Stacks",
        unit: "Unit 1",
        difficultyLevel: 3,
        estimatedTime: 10,
        marks: 5,
        questionType: "5 Mark",
        options: [],
        correctAnswer: "",
        bloomsTaxonomy: "P",
        cloMapping: 1
    },
    {
        text: "Explain the AVL tree. Insert the following keys into an initially empty AVL tree and show each rotation performed: 10, 20, 30, 15, 25, 5, 4.",
        subject: "Data Structures and Algorithms",
        topic: "Trees",
        unit: "Unit 3",
        difficultyLevel: 4,
        estimatedTime: 12,
        marks: 5,
        questionType: "5 Mark",
        options: [],
        correctAnswer: "",
        bloomsTaxonomy: "P",
        cloMapping: 2
    },
    {
        text: "Explain BFS and DFS graph traversal algorithms. Perform BFS and DFS starting from vertex A on a graph of your choice with at least 6 vertices. Compare their time and space complexities.",
        subject: "Data Structures and Algorithms",
        topic: "Graphs",
        unit: "Unit 4",
        difficultyLevel: 3,
        estimatedTime: 10,
        marks: 5,
        questionType: "5 Mark",
        options: [],
        correctAnswer: "",
        bloomsTaxonomy: "P",
        cloMapping: 3
    },
    {
        text: "Write a function to detect a cycle in a linked list using Floyd's Cycle Detection Algorithm. Explain how the algorithm works with a diagram and analyze its time and space complexity.",
        subject: "Data Structures and Algorithms",
        topic: "Linked Lists",
        unit: "Unit 1",
        difficultyLevel: 3,
        estimatedTime: 10,
        marks: 5,
        questionType: "5 Mark",
        options: [],
        correctAnswer: "",
        bloomsTaxonomy: "P",
        cloMapping: 1
    },
    {
        text: "Explain Kruskal's Algorithm for finding the Minimum Spanning Tree. Apply it to a graph with 6 vertices and 9 edges. State the role of the Union-Find data structure.",
        subject: "Data Structures and Algorithms",
        topic: "Graphs",
        unit: "Unit 4",
        difficultyLevel: 4,
        estimatedTime: 12,
        marks: 5,
        questionType: "5 Mark",
        options: [],
        correctAnswer: "",
        bloomsTaxonomy: "P",
        cloMapping: 3
    },
    {
        text: "Explain the Heap Sort algorithm. Build a max-heap from array [4, 10, 3, 5, 1, 8, 7, 2, 9, 6] and then sort it. Analyze the time complexity of each step.",
        subject: "Data Structures and Algorithms",
        topic: "Heaps",
        unit: "Unit 3",
        difficultyLevel: 3,
        estimatedTime: 10,
        marks: 5,
        questionType: "5 Mark",
        options: [],
        correctAnswer: "",
        bloomsTaxonomy: "P",
        cloMapping: 2
    },
    {
        text: "Explain the QuickSort algorithm with the partition procedure. Sort the array [50, 23, 9, 18, 61, 32] using QuickSort, showing the state of the array after each partition. Discuss best-case and worst-case scenarios.",
        subject: "Data Structures and Algorithms",
        topic: "Sorting",
        unit: "Unit 2",
        difficultyLevel: 3,
        estimatedTime: 10,
        marks: 5,
        questionType: "5 Mark",
        options: [],
        correctAnswer: "",
        bloomsTaxonomy: "P",
        cloMapping: 2
    },

    // ============================================================
    // 10 Mark Questions (10 questions)
    // ============================================================
    {
        text: "Explain all major sorting algorithms (Bubble Sort, Selection Sort, Insertion Sort, Merge Sort, Quick Sort, and Heap Sort). Compare them in terms of time complexity (best, average, worst), space complexity, stability, and use cases. Which sorting algorithm would you recommend for nearly sorted data and why?",
        subject: "Data Structures and Algorithms",
        topic: "Sorting",
        unit: "Unit 2",
        difficultyLevel: 4,
        estimatedTime: 20,
        marks: 10,
        questionType: "10 Mark",
        options: [],
        correctAnswer: "",
        bloomsTaxonomy: "E",
        cloMapping: 2
    },
    {
        text: "Describe the Binary Search Tree (BST) data structure in detail. Explain and write pseudocode for insertion, deletion (all three cases), and search operations. Discuss the time complexity of each operation for balanced and skewed BSTs. How does an AVL tree improve upon a regular BST?",
        subject: "Data Structures and Algorithms",
        topic: "Trees",
        unit: "Unit 3",
        difficultyLevel: 4,
        estimatedTime: 22,
        marks: 10,
        questionType: "10 Mark",
        options: [],
        correctAnswer: "",
        bloomsTaxonomy: "E",
        cloMapping: 2
    },
    {
        text: "Discuss graph traversal and shortest path algorithms in detail. Explain BFS, DFS, Dijkstra's, and Bellman-Ford algorithms with pseudocode. Compare their time complexities, use cases, and limitations. When would you use Bellman-Ford over Dijkstra's algorithm?",
        subject: "Data Structures and Algorithms",
        topic: "Graphs",
        unit: "Unit 4",
        difficultyLevel: 5,
        estimatedTime: 25,
        marks: 10,
        questionType: "10 Mark",
        options: [],
        correctAnswer: "",
        bloomsTaxonomy: "E",
        cloMapping: 3
    },
    {
        text: "Explain the concept of hashing in detail. Discuss hash functions (division, multiplication, universal hashing), collision resolution strategies (separate chaining, linear probing, quadratic probing, double hashing), and dynamic resizing. Analyze the performance of hash tables under different load factors with examples.",
        subject: "Data Structures and Algorithms",
        topic: "Hashing",
        unit: "Unit 5",
        difficultyLevel: 5,
        estimatedTime: 25,
        marks: 10,
        questionType: "10 Mark",
        options: [],
        correctAnswer: "",
        bloomsTaxonomy: "E",
        cloMapping: 4
    },
    {
        text: "Explain the stack data structure and its applications. Discuss the following applications in detail with algorithms and examples: (a) Infix to postfix conversion, (b) Postfix expression evaluation, (c) Balanced parentheses checking, (d) Tower of Hanoi problem. Analyze the time and space complexity for each application.",
        subject: "Data Structures and Algorithms",
        topic: "Stacks",
        unit: "Unit 1",
        difficultyLevel: 4,
        estimatedTime: 22,
        marks: 10,
        questionType: "10 Mark",
        options: [],
        correctAnswer: "",
        bloomsTaxonomy: "P",
        cloMapping: 1
    },
    {
        text: "Discuss linked list variations (singly, doubly, circular) in detail. For each type, explain the structure, write algorithms for insertion (beginning, end, middle), deletion, and reversal operations. Compare their advantages, disadvantages, and use cases. When would you use a doubly linked list over a singly linked list?",
        subject: "Data Structures and Algorithms",
        topic: "Linked Lists",
        unit: "Unit 1",
        difficultyLevel: 4,
        estimatedTime: 22,
        marks: 10,
        questionType: "10 Mark",
        options: [],
        correctAnswer: "",
        bloomsTaxonomy: "P",
        cloMapping: 1
    },
    {
        text: "Explain Minimum Spanning Tree (MST) algorithms — Prim's and Kruskal's. Write pseudocode for both. Apply both algorithms step by step on a connected weighted graph with at least 7 vertices. Compare their time complexities using different data structures. Discuss the role of greedy strategy in both algorithms.",
        subject: "Data Structures and Algorithms",
        topic: "Graphs",
        unit: "Unit 4",
        difficultyLevel: 5,
        estimatedTime: 25,
        marks: 10,
        questionType: "10 Mark",
        options: [],
        correctAnswer: "",
        bloomsTaxonomy: "E",
        cloMapping: 3
    },
    {
        text: "Explain the divide and conquer algorithm paradigm. Discuss its application in (a) Merge Sort, (b) Quick Sort, (c) Binary Search, and (d) Strassen's Matrix Multiplication. For each, write the recurrence relation and solve it using the Master Theorem. Compare the efficiency of these algorithms.",
        subject: "Data Structures and Algorithms",
        topic: "Algorithm Design",
        unit: "Unit 2",
        difficultyLevel: 5,
        estimatedTime: 25,
        marks: 10,
        questionType: "10 Mark",
        options: [],
        correctAnswer: "",
        bloomsTaxonomy: "N",
        cloMapping: 2
    },
    {
        text: "Explain the concept of self-balancing BSTs. Discuss AVL trees in detail including balance factor, rotations (LL, RR, LR, RL), insertion, and deletion operations. Compare AVL trees with Red-Black trees in terms of structure, balancing criteria, operations, and performance. Insert keys 15, 20, 24, 10, 13, 7, 30, 36, 25 into an AVL tree showing all rotations.",
        subject: "Data Structures and Algorithms",
        topic: "Trees",
        unit: "Unit 3",
        difficultyLevel: 5,
        estimatedTime: 25,
        marks: 10,
        questionType: "10 Mark",
        options: [],
        correctAnswer: "",
        bloomsTaxonomy: "N",
        cloMapping: 2
    },
    {
        text: "Discuss Dynamic Programming as an algorithm design strategy. Compare it with the Greedy approach and Divide and Conquer. Solve the following problems using dynamic programming with tabulation and memoization approaches: (a) 0/1 Knapsack (b) Longest Common Subsequence. Write the recurrence relation, time complexity, and space complexity for each.",
        subject: "Data Structures and Algorithms",
        topic: "Algorithm Design",
        unit: "Unit 5",
        difficultyLevel: 5,
        estimatedTime: 25,
        marks: 10,
        questionType: "10 Mark",
        options: [],
        correctAnswer: "",
        bloomsTaxonomy: "N",
        cloMapping: 5
    }
];

async function seedQuestions() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Check for duplicates before inserting
        let inserted = 0;
        let skipped = 0;

        for (const q of dsaQuestions) {
            const existing = await Question.findOne({
                text: { $regex: new RegExp('^' + q.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') }
            });

            if (existing) {
                console.log(`⏭️  Skipped (duplicate): "${q.text.substring(0, 60)}..."`);
                skipped++;
            } else {
                await Question.create(q);
                inserted++;
            }
        }

        console.log(`\n✅ Seeding complete!`);
        console.log(`   📝 Inserted: ${inserted} questions`);
        console.log(`   ⏭️  Skipped:  ${skipped} duplicates`);
        console.log(`   📊 Total in DB: ${await Question.countDocuments()} questions`);

        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    } catch (error) {
        console.error('❌ Error seeding questions:', error.message);
        process.exit(1);
    }
}

seedQuestions();
