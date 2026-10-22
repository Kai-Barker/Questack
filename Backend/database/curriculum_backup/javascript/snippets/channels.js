function channelName(channel) {
  switch (channel) {
    case 1:
      return "Command";
    case 2:
      return "Engineering";
    default:
      return "Unknown channel";
  }
}

console.log(channelName(1));
console.log(channelName("1"));
console.log(channelName(2));
