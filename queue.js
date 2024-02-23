"use strict";

export default class Queue {
    constructor(elements=null) {
        this.elements = elements || {};
        this.head = Math.min(...Object.keys(elements));
        if (this.head === Infinity) this.head = 0;
        this.tail = Math.max(...Object.keys(elements));
        if (this.tail === Infinity) this.head = 0;
    }

    enqueue(element) {
        this.elements[this.tail] = element;
        this.tail++;
    }

    dequeue() {
        const item = this.elements[this.head];
        delete this.elements[this.head];
        this.head++;
        return item;
    }

    peek() {
        return this.elements[this.head];
    }

    get length() {
        return this.tail - this.head;
    }
}