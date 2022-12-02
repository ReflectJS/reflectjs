
export interface ValueProps {
  key: string;
  val: any;
}

export class Value {
  key: string;
  val: any;

  constructor(props: ValueProps) {
    this.key = props.key;
    this.val = props.val;
  }
}
