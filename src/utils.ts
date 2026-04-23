export const formatUserDisplayName = (user: { name?: string; email?: string } | null): string => {
  if (!user) return 'Aparna Boligerla';
  
  if (user.name && user.name !== 'System' && user.name !== 'Shaik Yashu' && user.name !== 'Manager') {
    return user.name;
  }
  
  if (user.email) {
    const email = user.email.toLowerCase();
    const part = email.split('@')[0];
    
    if (part === 'aparnaboligerla') return 'Aparna Boligerla';
    
    // Format "firstname.lastname" or "firstname_lastname" to "Firstname Lastname"
    return part.split(/[._]/)
      .map((s: string) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');
  }
  
  return 'Aparna Boligerla';
};
