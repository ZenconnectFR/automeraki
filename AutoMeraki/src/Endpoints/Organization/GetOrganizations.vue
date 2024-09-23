<script>
/**
 * Script to get the list of organizations
 */

import Axios from 'axios'

/**
 * Get the list of organizations
 * @returns {Object[]} - The list of organizations
 */
export async function getOrganizations() {
  try {
    const response = await Axios.get(`${import.meta.env.VITE_APP_API_URL}/organizations`)
    return response.data
  } catch (error) {
    console.error(error)
    return null
  }
}
</script>
