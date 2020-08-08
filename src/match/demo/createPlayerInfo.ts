import { PlayerInfo, Position } from '@bantr/lib/dist/entities';
import { Weapon as WeaponEnum } from '@bantr/lib/dist/types/Weapon.enum';
import * as Sentry from '@sentry/node';
import { DemoFile, Player, Weapon } from 'demofile';

function translateDemoWeaponToEnum(weapon: Weapon): WeaponEnum {
  const errorMessage = `Unknown weapon - ${weapon.className}`;
  switch (weapon.className) {
    case 'weapon_healthshot':
      return WeaponEnum.Healthshot;
    case 'weapon_tagrenade':
      return WeaponEnum.TAGrenade;
    case 'weapon_sg556':
      return WeaponEnum.SG556;
    case 'weapon_hkp2000':
      return WeaponEnum.P2000;
    case 'weapon_taser':
      return WeaponEnum.Taser;
    case 'weapon_smokegrenade':
      return WeaponEnum.SmokeGrenade;
    case 'weapon_flashbang':
      return WeaponEnum.Flashbang;
    case 'weapon_hegrenade':
      return WeaponEnum.HEGrenade;
    case 'weapon_incgrenade':
      return WeaponEnum.IncendiaryGrenade;
    case 'weapon_molotov':
      return WeaponEnum.Molotov;
    case 'weapon_decoy':
      return WeaponEnum.Decoy;
    case 'weapon_c4':
      return WeaponEnum.C4;
    case 'weapon_mac10':
      return WeaponEnum.MAC10;
    case 'weapon_ak47':
      return WeaponEnum.AK47;
    case 'weapon_aug':
      return WeaponEnum.AUG;
    case 'weapon_awp':
      return WeaponEnum.AWP;
    case 'weapon_cz75a':
      return WeaponEnum.CZ75;
    case 'weapon_deagle':
      return WeaponEnum.DesertEagle;
    case 'weapon_elite':
      return WeaponEnum.DualBerettas;
    case 'weapon_famas':
      return WeaponEnum.Famas;
    case 'weapon_fiveseven':
      return WeaponEnum.FiveSeven;
    case 'weapon_g3sg1':
      return WeaponEnum.G3SG1;
    case 'weapon_galilar':
      return WeaponEnum.Galil;
    case 'weapon_glock':
      return WeaponEnum.Glock;
    case 'weapon_knife':
      return WeaponEnum.Knife;
    case 'weapon_knifegg':
      return WeaponEnum.Knife;
    case 'weapon_m249':
      return WeaponEnum.M249;
    case 'weapon_m4a1':
      return WeaponEnum.M4A4;
    case 'weapon_m4a1_silencer':
      return WeaponEnum.M4A1S;
    case 'weapon_mag7':
      return WeaponEnum.Mag7;
    case 'weapon_mp5sd':
      return WeaponEnum.MP5;
    case 'weapon_mp7':
      return WeaponEnum.MP7;
    case 'weapon_mp9':
      return WeaponEnum.MP9;
    case 'weapon_negev':
      return WeaponEnum.Negev;
    case 'weapon_nova':
      return WeaponEnum.Nova;
    case 'weapon_p250':
      return WeaponEnum.P250;
    case 'weapon_p90':
      return WeaponEnum.P90;
    case 'weapon_sawedoff':
      return WeaponEnum.SawedOff;
    case 'weapon_scar20':
      return WeaponEnum.SCAR20;
    case 'weapon_ssg08':
      return WeaponEnum.SSG08;
    case 'weapon_tec9':
      return WeaponEnum.Tec9;
    case 'weapon_ump45':
      return WeaponEnum.UMP45;
    case 'weapon_usp_silencer':
      return WeaponEnum.USP;
    case 'weapon_xm1014':
      return WeaponEnum.XM1014;
    case 'weapon_revolver':
      return WeaponEnum.R8Revolver;
    case 'weapon_bizon':
      return WeaponEnum.PPBizon;
    default:
      if (weapon.className.includes('weapon_knife')) {
        return WeaponEnum.Knife;
      }

      if (weapon.className.includes('weapon_bayonet')) {
        return WeaponEnum.Knife;
      }

      Sentry.captureException(new Error(errorMessage));
      console.log(errorMessage);
      return null;
  }
}

export default function createPlayerInfo(demoFile: DemoFile, player: Player) {
  const playerInfo = new PlayerInfo();
  const position = new Position();

  position.x = `${player.position.x}`;
  position.y = `${player.position.y}`;
  position.z = `${player.position.z}`;

  playerInfo.position = position;

  playerInfo.armour = player.armor;
  playerInfo.health = player.health;
  playerInfo.cashSpentInRound = player.cashSpendThisRound;
  playerInfo.equipmentValue = player.currentEquipmentValue;
  playerInfo.freezeTimeEndEquipmentValue = player.freezeTimeEndEquipmentValue;
  playerInfo.hasC4 = player.hasC4;
  playerInfo.isScoped = player.isScoped;
  playerInfo.tick = demoFile.currentTick;
  if (player.weapon) {
    playerInfo.bulletsInMagazine = player.weapon.clipAmmo;
    playerInfo.weapon = translateDemoWeaponToEnum(player.weapon);
  } else {
    playerInfo.bulletsInMagazine = 0;
  }

  return playerInfo;
}
