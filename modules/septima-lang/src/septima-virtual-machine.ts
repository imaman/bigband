import { CodeFile } from "./code-emitter.js";

export class SeptimaVirtualMachine {
  constructor(private readonly cf: CodeFile) {}


  private opstack: unknown[] = []

  run() {
    for (const at of this.cf.codes) {
      
    }
  }
}