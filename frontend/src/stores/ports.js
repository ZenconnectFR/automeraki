import { defineStore } from 'pinia'

export const usePortsStore = defineStore('ports', () => {
    /**
     * Switches ports :
     *  [
     *      {
     *         serial : str,
     *         ports : [
     *           {
     *              id : int,
     *              name : str,
     *              vlan : str
     *              type : str
     *           }
     *         ]
     *      }
     *  ]
     */
    const switchesPorts = ref([]);

    const setSwitchesPorts = (ports) => switchesPorts.value = ports;

    const setSwitchPorts = (ports, serial) => {
        const index = switchesPorts.value.findIndex(s => s.serial === serial);
        if (index === -1) {
            switchesPorts.value.push({ serial, ports });
        } else {
            switchesPorts.value[index].ports = ports;
        }
    }

    const setSwitchPort = (port, serial) => {
        const index = switchesPorts.value.findIndex(s => s.serial === serial);
        if (index === -1) {
            switchesPorts.value.push({ serial, ports: [port] });
        } else {
            const portIndex = switchesPorts.value[index].ports.findIndex(p => p.id === port.id);
            if (portIndex === -1) {
                switchesPorts.value[index].ports.push(port);
            } else {
                switchesPorts.value[index].ports[portIndex] = port;
            }
        }
    }



    return {
        switchesPorts,
        setSwitchesPorts,
        setSwitchPorts,
        setSwitchPort
    }
});
