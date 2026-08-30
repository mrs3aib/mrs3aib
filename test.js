class Animal {
    name; 
    constructor(ne){
        this.name =ne||"Rocky"
    }
}

class Dog extends Animal {
 constructor() {
  super("stan");
 }
}

const dog = new Dog();

console.log(dog.name)