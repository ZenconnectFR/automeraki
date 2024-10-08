/**
 * IP Type: IPv4 only. can't be empty and can't follow another pattern than IPv4
 */

export type ipType = string;

function isIpType(ip: string): ip is ipType {
  return /^(\b25[0-5]|\b2[0-4][0-9]|\b[01]?[0-9][0-9]?)(\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/.test(ip);
}


/**
 * Creates an IP type
 * @param ip - the IP address. It must be a valid IPv4 address
 * @returns ipType
 */
export function createIp(ip: string): ipType {
    if (!isIpType(ip)) {
        throw new Error("Invalid IP address");
    }
    return ip as ipType;
}

/**
 * Checks if an Ip is higher than another.
 * @param ip1 - the first IP address
 * @param ip2 - the second IP address
 * @returns boolean - true if ip1 is strictly higher than ip2, false otherwise
 */
export function isIpHigher(ip1: ipType, ip2: ipType): boolean {

    console.log('comparing', ip1, ip2);

    const ip1Split = ip1.split('.').map(part => parseInt(part));
    const ip2Split = ip2.split('.').map(part => parseInt(part));

    for (let i = 0; i < 4; i++) {
        if (ip1Split[i] > ip2Split[i]) {
            return true;
        } else if (ip1Split[i] < ip2Split[i]) {
            return false;
        }
    }
    return false;
}

/**
 * Transforms an ipType to a 32 bit integer
 * @param ip - the ipType to transform
 * @returns number - the 32 bit integer
 */

export function ipToInt(ip: ipType): number {
    
    if (!isIpType(ip)) {
        throw new Error("Invalid IP address");
    }
    const ipSplit = ip.split('.').map(part => parseInt(part));
    return (ipSplit[0] << 24) + (ipSplit[1] << 16) + (ipSplit[2] << 8) + ipSplit[3];
}

/**
 * Transforms a 32 bit integer to an ipType
 * @param ipInt - the 32 bit integer to transform
 * @returns ipType - the ipType
 * @throws Error - if the integer is not a valid ip address
 */
export function intToIp(ipInt: number): ipType {
    // console.log(ipInt);
    if (ipInt < 0 || ipInt > 0xFFFFFFFF) {
        throw new Error("Invalid IP integer");
    }
    return `${(ipInt >>> 24)}.${(ipInt >> 16) & 0xFF}.${(ipInt >> 8) & 0xFF}.${ipInt & 0xFF}` as ipType;
}

/**
 * Increments a subnet by one
 * @param subnet - the subnet to increment (ipType)
 * @param mask - the mask of the subnet (number between 0 and 32)
 * @param max - the maximum value of the subnet (ipType)
 * @returns ipType - the incremented subnet or null if the subnet is higher than the max
 * @throws Error - if the subnet is not a valid ip address
 * @throws Error - if the mask is not a valid mask
 */
export function incrementSubnet(subnet: ipType, mask: number, max?: ipType): ipType | null {
    if (!isIpType(subnet)) {
        throw new Error("Invalid IP address");
    }
    if (mask < 0 || mask > 32) {
        throw new Error("Invalid mask");
    }

    // console.log('subnet', subnet, 'mask', mask);
    
    const subnetInt = ipToInt(subnet);
    const subnetBits = 32 - mask;
    const subnetMask = -1 << subnetBits >>> 0;

    const subnetBase = subnetInt & subnetMask;
    const incrementedSubnet = (subnetBase + (1 << subnetBits)) >>> 0;



    if (max) {
        if (isIpHigher(intToIp(incrementedSubnet), max)) {
            console.log('max', max, 'incrementedSubnet', intToIp(incrementedSubnet));
            return null;
        }
    }

    // console.log('incrementedSubnet', incrementedSubnet);

    return intToIp(incrementedSubnet);
}

/**
 * Decrements a subnet by one
 * @param subnet - the subnet to decrement (ipType)
 * @param mask - the mask of the subnet (number between 0 and 32)
 * @param min - the minimum value of the subnet (ipType)
 * @returns ipType - the decremented subnet or null if the subnet is lower than the min
 * @throws Error - if the subnet is not a valid ip address
 * @throws Error - if the mask is not a valid mask
 */

export function decrementSubnet(subnet: ipType, mask: number, min?: ipType): ipType | null {
    if (!isIpType(subnet)) {
        throw new Error("Invalid IP address");
    }
    if (mask < 0 || mask > 32) {
        throw new Error("Invalid mask");
    }

    const subnetInt = ipToInt(subnet);
    const subnetBits = 32 - mask;
    const subnetMask = -1 << subnetBits;

    const subnetBase = subnetInt & subnetMask;
    const decrementedSubnet = subnetBase - (1 << subnetBits);

    if (min) {
        // apply mask to min too
        const minInt = ipToInt(min);
        const minBase = minInt & subnetMask;
        if (decrementedSubnet < minBase) {
            return null;
        }
    }

    return intToIp(decrementedSubnet);
}


/**
 * Function to find the next free subnet in a list of subnets (array of strings with the form "ip/mask")
 * @param subnets - the list of subnets
 * @param allowed - a list of allowed subnets ranges. must be formatted as "ip/mask-ip/mask"
 * @param excepts - a list of regexps of subnets to exclude. Optional
 * @returns string - the next free subnet or null if there is no free subnet
 */
export function findNextFreeSubnet(subnets: string[], allowed: string[], excepts?: RegExp[]): string | null {
    // console.log('subnets', subnets);
    // console.log('allowed', allowed);
    // console.log('excepts', excepts);
    
    // parse subnets into { ip: number, mask: number }
    const parsedSubnets = subnets.map(subnet => {
        const [ip, mask] = subnet.split('/');
        return { ip: ipToInt(ip), mask: parseInt(mask) };
    });

    // sort them by ip
    parsedSubnets.sort((a, b) => a.ip - b.ip);

    console.log('parsedSubnets', parsedSubnets);

    // parse allowed into { start: number, end: number, mask: number } // mask will always be the same for a pair of start and end
    const parsedAllowed = allowed.map(range => {
        const [start, end] = range.split('-');
        console.log('start', start, 'end', end);
        const [startIp, startMask] = start.split('/');
        const [endIp, endMask] = end.split('/');
        return { start: ipToInt(startIp), end: ipToInt(endIp), mask: parseInt(startMask) };
    });

    // sort them by start
    parsedAllowed.sort((a, b) => a.start - b.start);
    console.log('parsedAllowed', parsedAllowed);

    console.log('Excepts:', excepts);

    // Convert excepts into a function for testing
    const isExcept = (subnet: string) => {
        // Check if excepts is an array, if not, return false
        if (!Array.isArray(excepts)) {
            console.log("Excepts is not an array, ignoring exclusions.");
            return false; // No exclusions
        }

        // Ensure all elements in `excepts` are RegExp
        const allAreRegExps = excepts.every((ex) => ex instanceof RegExp);
        if (!allAreRegExps) {
            console.error("Excepts contains non-RegExp values.");
            return false; // Skip matching if excepts contains invalid values
        }

        // Test against each regex in the array
        return excepts.some(regex => regex.test(subnet));
    };

    // iterate over the ranges and find the first free subnet
    for (const range of parsedAllowed) {
        let current = range.start;

        while (current < range.end) {
            const currentIp = `${intToIp(current)}/${range.mask}`;
            // console.log('currentIp', currentIp);

            // check if in use
            const inUse = parsedSubnets.some(subnet => {
                return subnet.ip === current && subnet.mask === range.mask;
            });

            // check if in excepts
            const isExcepted = isExcept(currentIp);

            if (!inUse && !isExcepted) {
                return currentIp;
            }

            current += (1 << (32 - range.mask));
        }
    }
    return null;
}





// small unit tests

/*

const subnets = [
    "10.101.1.0/24",
    "10.101.2.0/24",
    "10.101.3.0/24",
];

const subnets2 = [
    "10.101.1.0/24",
    "10.101.2.0/24",
    "10.101.4.0/24",
];

const subnets3 = [
    "10.101.1.0/24",
    "10.101.2.0/24",
    "10.101.3.0/24",
    "10.101.4.0/24",
    "10.101.5.0/24",
    "10.101.6.0/24",
    "10.101.7.0/24",
    "10.101.8.0/24",
    "10.101.9.0/24",
    "10.101.10.0/24",
];

const maxSubnet = "10.101.10.0/24"; // Maximum allowed subnet

const nextFreeSubnet = findNextFreeSubnet(subnets, maxSubnet);
console.log(nextFreeSubnet); // Expected Output: "10.101.4.0/24""
const nextFreeSubnet2 = findNextFreeSubnet(subnets2, maxSubnet);
console.log(nextFreeSubnet2); // Expected Output: "10.101.3.0/24"
const nextFreeSubnet3 = findNextFreeSubnet(subnets3, maxSubnet);
console.log(nextFreeSubnet3); // Expected Output: "null"
    
*/
