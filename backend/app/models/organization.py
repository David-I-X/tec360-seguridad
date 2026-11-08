"""
Organization and OrganizationMember models for Workshop / Company Accounts (Cuentas Empresa / Talleres).
Implements Option A: Organization with Members, Single Shared Wallet with Per-Technician Quotas,
Configurable Dispatch Mode (manual vs direct), and Single Welcome Bonus per Workshop.
"""
from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4
from sqlmodel import SQLModel, Field


class OrgRole(str, Enum):
    """Internal roles within a Workshop / Organization"""
    owner = "owner"
    manager = "manager"
    technician = "technician"


class OrgMemberStatus(str, Enum):
    """Membership lifecycle status within an Organization"""
    invited = "invited"
    active = "active"
    suspended = "suspended"


class DispatchMode(str, Enum):
    """How jobs/offers are handled for technicians in this Organization"""
    manual = "manual"  # Workshop owner/manager assigns jobs to member technicians
    direct = "direct"  # Technicians receive and accept jobs directly; workshop has visibility


class Organization(SQLModel, table=True):
    """
    Workshop / Company entity (Cuenta Empresa / Taller).
    Holds a single shared wallet balance and receives a single $200,000 COP welcome bonus.
    The owner is administrative and does NOT operate as a field technician.
    """
    __tablename__ = "organizations"

    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True, nullable=False)
    name: str = Field(max_length=160, nullable=False, index=True)
    nit: Optional[str] = Field(default=None, max_length=64, index=True)
    phone: Optional[str] = Field(default=None, max_length=32)
    email: Optional[str] = Field(default=None, max_length=255)
    address: Optional[str] = Field(default=None, max_length=255)
    city: str = Field(default="Medellín", max_length=100)
    logo_url: Optional[str] = Field(default=None, max_length=500)

    owner_id: UUID = Field(foreign_key="users.id", nullable=False, index=True)

    # Dispatch configuration: "manual" (taller asigna) or "direct" (técnico recibe directo)
    dispatch_mode: str = Field(default=DispatchMode.manual.value, max_length=32)

    is_verified: bool = Field(default=False)
    is_active: bool = Field(default=True)

    # Shared Organization Wallet (COP)
    wallet_balance: float = Field(default=0.0, ge=0.0)
    total_recharged: float = Field(default=0.0, ge=0.0)
    total_consumed: float = Field(default=0.0, ge=0.0)
    welcome_bonus_granted: bool = Field(default=False)

    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class OrganizationMember(SQLModel, table=True):
    """
    Links a User to an Organization with a specific role and optional credit quota.
    - owner: Administrative owner of the workshop (does NOT work as a technician).
    - manager: Workshop dispatcher/coordinator who can assign jobs and quotas.
    - technician: Field technician belonging to the workshop.
    """
    __tablename__ = "organization_members"

    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True, nullable=False)
    organization_id: UUID = Field(foreign_key="organizations.id", nullable=False, index=True)
    user_id: UUID = Field(foreign_key="users.id", nullable=False, index=True)

    org_role: str = Field(default=OrgRole.technician.value, max_length=32, index=True)
    status: str = Field(default=OrgMemberStatus.active.value, max_length=32, index=True)

    # Quota management within the Organization's shared wallet:
    # None = no individual cap (can use up to Organization.wallet_balance)
    # >= 0.0 = maximum COP commission quota assigned to this technician
    credit_quota: Optional[float] = Field(default=None, ge=0.0)
    quota_used: float = Field(default=0.0, ge=0.0)

    invited_phone: Optional[str] = Field(default=None, max_length=32)

    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
